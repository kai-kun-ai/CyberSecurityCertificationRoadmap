import { t } from "./i18n.js";
import { searchCerts, highlightFragments } from "./search.js";
import { tierOf } from "./facets.js";

/**
 * Type-ahead results list under the header search box.
 *
 * The matrix keeps its highlight / dim behaviour (and the optional
 * "hide non-matches" filter); this palette adds what a dense matrix
 * cannot: a ranked, readable list (abbr + full name + vendor + tier +
 * domain) you can walk with ↑ ↓ and pick with Enter.
 */

const MAX_ROWS = 12;

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function marked(text, query) {
  return highlightFragments(text, query)
    .map(f => f.hit ? `<mark>${escapeHtml(f.str)}</mark>` : escapeHtml(f.str))
    .join("");
}

export function attachSearchPalette({ input, clearBtn, resultsEl, getCtx, onQuery, onSelect, onToggleFilter }) {
  let active = -1;        // highlighted row index
  let rows = [];          // current result certs
  let open = false;
  let composing = false;  // IME composition in progress (Japanese input)

  const ctxNow = () => getCtx();

  function setOpen(next) {
    open = next && !!input.value.trim();
    resultsEl.hidden = !open;
    input.setAttribute("aria-expanded", String(open));
    if (!open) { active = -1; input.removeAttribute("aria-activedescendant"); }
  }

  function render() {
    const ctx = ctxNow();
    const q = input.value;
    const lang = ctx.lang;
    if (!q.trim()) { setOpen(false); return; }
    const results = searchCerts(ctx.certs, ctx.index, q);
    rows = results.slice(0, MAX_ROWS).map(r => r.cert);
    const total = results.length;
    const hidden = total - rows.length;

    const header = `
      <div class="sr-head">
        <span class="sr-count">${total} ${escapeHtml(t("search_matches", lang))}</span>
        <button type="button" class="sr-filter-toggle" aria-pressed="${ctx.searchFilter ? "true" : "false"}"
                title="${escapeHtml(t("search_filter_tooltip", lang))}">
          ${escapeHtml(t("search_filter_toggle", lang))}
        </button>
      </div>`;

    if (!rows.length) {
      resultsEl.innerHTML = header + `<div class="sr-empty">${escapeHtml(t("search_no_results", lang))}</div>`;
      setOpen(true);
      return;
    }

    const items = rows.map((c, i) => {
      const tier = ctx.tiersById.get(tierOf(c));
      const dom  = ctx.domainsById.get(c.domain);
      const name = lang === "ja" ? (c.name_ja || c.name) : c.name;
      const tierLabel = tier ? (lang === "ja" ? (tier.label_ja || tier.label_en) : tier.label_en) : "";
      const domLabel  = dom ? (lang === "ja" ? (dom.label_ja || dom.label_en) : dom.label_en) : "";
      const hiddenByFilter = ctx.visibleIds && !ctx.visibleIds.has(c.id);
      return `
        <div class="sr-row${hiddenByFilter ? " sr-filtered" : ""}" role="option" id="sr-opt-${i}" data-index="${i}" data-cert-id="${escapeHtml(c.id)}" aria-selected="false">
          <span class="sr-abbr">${marked(c.abbr, q)}${c.japan_only ? ` <span class="jp-badge">JP</span>` : ""}</span>
          <span class="sr-name">${marked(name, q)}</span>
          <span class="sr-meta">
            <span class="sr-vendor">${marked(c.vendor?.name || "", q)}</span>
            ${tier ? `<span class="tier-pill" data-tier="${escapeHtml(tier.id)}">${escapeHtml(tierLabel)}</span>` : ""}
            ${dom ? `<span class="sr-domain"><i style="background:${escapeHtml(dom.color || "#888")}"></i>${escapeHtml(domLabel)}</span>` : ""}
            ${hiddenByFilter ? `<span class="sr-hidden-note">${escapeHtml(t("sr_hidden_by_filter", lang))}</span>` : ""}
          </span>
        </div>`;
    }).join("");

    const footer = `
      <div class="sr-foot">
        ${hidden > 0 ? `<span class="sr-more">+${hidden} ${escapeHtml(t("search_more", lang))}</span>` : `<span></span>`}
        <span class="sr-keys">${escapeHtml(t("search_keys_hint", lang))}</span>
      </div>`;

    resultsEl.innerHTML = header + `<div class="sr-list">${items}</div>` + footer;
    setOpen(true);
    setActive(active >= 0 && active < rows.length ? active : -1);
  }

  function setActive(i) {
    active = i;
    const opts = resultsEl.querySelectorAll(".sr-row");
    opts.forEach((o, k) => o.setAttribute("aria-selected", String(k === i)));
    if (i >= 0 && opts[i]) {
      input.setAttribute("aria-activedescendant", opts[i].id);
      opts[i].scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function pick(i) {
    const c = rows[i];
    if (!c) return;
    setOpen(false);
    onSelect(c.id);
  }

  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => { composing = false; onQuery(input.value); render(); });
  input.addEventListener("input", () => {
    onQuery(input.value);
    if (!composing) render();
  });
  input.addEventListener("focus", () => { if (input.value.trim()) render(); });
  input.addEventListener("keydown", e => {
    if (composing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { render(); return; }
      if (rows.length) setActive((active + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (rows.length) setActive((active - 1 + rows.length) % rows.length);
    } else if (e.key === "Enter") {
      if (!open) { render(); }
      if (rows.length) { e.preventDefault(); pick(active >= 0 ? active : 0); }
    } else if (e.key === "Escape") {
      if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); return; }
      // Not open: let app.js handle (clears the query).
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  });

  resultsEl.addEventListener("pointerdown", e => {
    // Keep focus in the input while clicking a result.
    e.preventDefault();
  });
  resultsEl.addEventListener("click", e => {
    const toggle = e.target.closest(".sr-filter-toggle");
    if (toggle) { e.stopPropagation(); onToggleFilter(); render(); return; }
    const row = e.target.closest(".sr-row");
    if (row) { e.stopPropagation(); pick(parseInt(row.dataset.index, 10)); }
  });
  resultsEl.addEventListener("pointermove", e => {
    const row = e.target.closest(".sr-row");
    if (row) { const i = parseInt(row.dataset.index, 10); if (i !== active) setActive(i); }
  });

  document.addEventListener("click", e => {
    if (!open) return;
    if (e.target.closest(".search-wrap")) return;
    setOpen(false);
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => { setOpen(false); });
  }

  // Global shortcut: "/" or Ctrl/Cmd+K focuses the box.
  document.addEventListener("keydown", e => {
    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")
      || document.activeElement?.isContentEditable;
    const isK = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k";
    if (isK || (!inField && e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey)) {
      e.preventDefault();
      input.focus();
      input.select();
      if (input.value.trim()) render();
    }
  });

  return {
    close: () => setOpen(false),
    refresh: () => { if (open) render(); },
    isOpen: () => open,
  };
}
