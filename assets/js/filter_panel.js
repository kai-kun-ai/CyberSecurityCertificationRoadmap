import { t } from "./i18n.js";
import { getState, setState, clearFilters } from "./url_state.js";
import { EXP_BANDS, COST_BANDS, facetCounts, tierOf, examInJapanese, expYears, costUsd } from "./facets.js";

/**
 * Facet side panel: domain chips, tier chips, exam-language / Japan-only
 * toggles, experience + cost bands and the vendor checklist. Every value
 * shows a live count of what clicking it would leave visible (all other
 * facets applied), so dead ends are visible before the click.
 */

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toggleIn(list, value) {
  const cur = Array.isArray(list) ? [...list] : [];
  const i = cur.indexOf(value);
  if (i >= 0) cur.splice(i, 1); else cur.push(value);
  return cur.length ? cur : null;
}

function bandLabel(b, lang) { return lang === "ja" ? b.label_ja : b.label_en; }

/** Build the panel DOM once per language. */
export function buildFilterPanel(container, { domains, tiers, vendors, lang }) {
  container.dataset.lang = lang;
  container.innerHTML = `
    <div class="facet-head">
      <span class="facet-panel-title">${escapeHtml(t("filters", lang))}</span>
      <button type="button" class="link facet-clear" data-action="clear-all">${escapeHtml(t("clear_filters", lang))}</button>
    </div>

    <section class="facet" data-facet="domains">
      <h3>${escapeHtml(t("facet_domain", lang))}</h3>
      <div class="chip-row">
        ${domains.map(d => `
          <button type="button" class="chip chip-domain" data-value="${escapeHtml(d.id)}" aria-pressed="false"
                  style="--chip-color:${escapeHtml(d.color || "#888")}" title="${escapeHtml(lang === "ja" ? (d.label_ja || d.label_en) : d.label_en)}">
            <i class="chip-swatch"></i>
            <span class="chip-label">${escapeHtml(lang === "ja" ? (d.label_ja || d.label_en) : d.label_en)}</span>
            <span class="chip-count"></span>
          </button>`).join("")}
      </div>
    </section>

    <section class="facet" data-facet="tiers">
      <h3>${escapeHtml(t("facet_tier", lang))}</h3>
      <div class="chip-row">
        ${tiers.map(tier => `
          <button type="button" class="chip chip-tier" data-value="${escapeHtml(tier.id)}" data-tier="${escapeHtml(tier.id)}" aria-pressed="false">
            <span class="chip-label">${escapeHtml(lang === "ja" ? (tier.label_ja || tier.label_en) : tier.label_en)}</span>
            <span class="chip-count"></span>
          </button>`).join("")}
      </div>
    </section>

    <section class="facet facet-toggles" data-facet="toggles">
      <h3>${escapeHtml(t("facet_lang", lang))}</h3>
      <label class="facet-toggle">
        <input type="checkbox" data-toggle="xja" />
        <span>${escapeHtml(t("facet_exam_ja", lang))}</span>
        <span class="chip-count" data-count="xja"></span>
      </label>
      <label class="facet-toggle">
        <input type="checkbox" data-toggle="jp" />
        <span>${escapeHtml(t("facet_jp_only", lang))}</span>
        <span class="chip-count" data-count="jp"></span>
      </label>
    </section>

    <section class="facet" data-facet="exp">
      <h3>${escapeHtml(t("facet_exp", lang))}</h3>
      <div class="chip-row">
        ${EXP_BANDS.map(b => `
          <button type="button" class="chip" data-value="${escapeHtml(b.id)}" aria-pressed="false">
            <span class="chip-label">${escapeHtml(bandLabel(b, lang))}</span>
            <span class="chip-count"></span>
          </button>`).join("")}
      </div>
    </section>

    <section class="facet" data-facet="cost">
      <h3>${escapeHtml(t("facet_cost", lang))}</h3>
      <div class="chip-row">
        ${COST_BANDS.map(b => `
          <button type="button" class="chip" data-value="${escapeHtml(b.id)}" aria-pressed="false">
            <span class="chip-label">${escapeHtml(bandLabel(b, lang))}</span>
            <span class="chip-count"></span>
          </button>`).join("")}
      </div>
    </section>

    <section class="facet facet-vendors" data-facet="vendors">
      <h3>
        ${escapeHtml(t("facet_vendor", lang))}
        <span class="vendor-actions">
          <button type="button" class="link" data-action="vendors-all">${escapeHtml(t("select_all", lang))}</button>
        </span>
      </h3>
      <input type="search" class="vendor-search" placeholder="${escapeHtml(t("vendor_search", lang))}" aria-label="${escapeHtml(t("vendor_search", lang))}" autocomplete="off" />
      <div class="vendor-list">
        ${vendors.map(v => `
          <label class="vendor-row" data-name="${escapeHtml(v.name.toLowerCase())}">
            <input type="checkbox" data-vendor="${escapeHtml(v.slug)}" />
            <span class="vendor-name">${escapeHtml(v.name)}</span>
            <span class="vendor-count"></span>
          </label>`).join("")}
      </div>
      <label class="vt-control" title="${escapeHtml(t("vt_tooltip", lang))}">
        <span class="vt-label">${escapeHtml(t("vt_label", lang))}</span>
        <input id="vt-input" type="number" min="0" step="1" inputmode="numeric" placeholder="0" aria-label="${escapeHtml(t("vt_tooltip", lang))}" />
        <span class="vt-suffix">${escapeHtml(t("vt_suffix", lang))}</span>
      </label>
    </section>
  `;

  if (container.dataset.wired) return;
  container.dataset.wired = "1";

  container.addEventListener("click", e => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "clear-all") { clearFilters(); return; }
    if (action === "vendors-all") { setState({ vendors: null }); return; }

    const chip = e.target.closest(".chip[data-value]");
    if (!chip) return;
    const facet = chip.closest(".facet")?.dataset.facet;
    const value = chip.dataset.value;
    const s = getState();
    if (facet === "domains") setState({ domains: toggleIn(s.domains, value) });
    else if (facet === "tiers") setState({ tiers: toggleIn(s.tiers, value) });
    else if (facet === "exp")   setState({ exp: toggleIn(s.exp, value) });
    else if (facet === "cost")  setState({ cost: toggleIn(s.cost, value) });
  });

  container.addEventListener("change", e => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement)) return;
    if (el.dataset.toggle === "xja") { setState({ xja: el.checked }); return; }
    if (el.dataset.toggle === "jp")  { setState({ jp: el.checked }); return; }
    if (el.dataset.vendor) {
      const boxes = container.querySelectorAll("input[data-vendor]");
      const checked = Array.from(boxes).filter(i => i.checked).map(i => i.dataset.vendor);
      setState({ vendors: checked.length === 0 || checked.length === boxes.length ? null : checked });
    }
  });

  container.addEventListener("input", e => {
    const el = e.target;
    if (el.classList.contains("vendor-search")) {
      const q = el.value.trim().toLowerCase();
      for (const row of container.querySelectorAll(".vendor-row")) {
        row.hidden = !!q && !row.dataset.name.includes(q);
      }
    } else if (el.id === "vt-input") {
      clearTimeout(container._vtDebounce);
      container._vtDebounce = setTimeout(() => {
        const n = parseInt(el.value.trim(), 10);
        setState({ vt: Number.isFinite(n) && n > 0 ? n : null });
      }, 200);
    }
  });
}

/** Refresh pressed / checked states and live counts. */
export function syncFilterPanel(container, { certs, ui, domains, tiers, vendors, lang }) {
  if (container.dataset.lang !== lang) buildFilterPanel(container, { domains, tiers, vendors, lang });

  const setChips = (facet, selected, counts) => {
    const sel = new Set(selected || []);
    for (const chip of container.querySelectorAll(`.facet[data-facet="${facet}"] .chip`)) {
      const v = chip.dataset.value;
      const n = counts.get(v) || 0;
      chip.setAttribute("aria-pressed", String(sel.has(v)));
      chip.querySelector(".chip-count").textContent = String(n);
      chip.classList.toggle("zero", n === 0 && !sel.has(v));
    }
  };

  setChips("domains", ui.domains, facetCounts(certs, ui, "domains", c => c.domain));
  setChips("tiers",   ui.tiers,   facetCounts(certs, ui, "tiers",   c => tierOf(c)));
  setChips("exp",     ui.expBands,  facetCounts(certs, ui, "exp",  c => EXP_BANDS.filter(b => b.test(expYears(c))).map(b => b.id)));
  setChips("cost",    ui.costBands, facetCounts(certs, ui, "cost", c => COST_BANDS.filter(b => b.test(costUsd(c))).map(b => b.id)));

  const xjaCounts = facetCounts(certs, ui, "xja", c => examInJapanese(c) ? "yes" : null);
  const jpCounts  = facetCounts(certs, { ...ui, showJp: true }, "jp", c => c.japan_only ? "yes" : null);
  const xjaBox = container.querySelector('input[data-toggle="xja"]');
  const jpBox  = container.querySelector('input[data-toggle="jp"]');
  if (xjaBox) xjaBox.checked = !!ui.examJa;
  if (jpBox)  jpBox.checked  = !!ui.showJp;
  const xjaCount = container.querySelector('[data-count="xja"]');
  const jpCount  = container.querySelector('[data-count="jp"]');
  if (xjaCount) xjaCount.textContent = String(xjaCounts.get("yes") || 0);
  if (jpCount)  jpCount.textContent  = String(jpCounts.get("yes") || 0);

  const vendorCounts = facetCounts(certs, ui, "vendors", c => c.vendor?.slug);
  const selectedVendors = ui.vendors && ui.vendors.length ? new Set(ui.vendors) : null;
  for (const row of container.querySelectorAll(".vendor-row")) {
    const box = row.querySelector("input[data-vendor]");
    const slug = box.dataset.vendor;
    box.checked = selectedVendors ? selectedVendors.has(slug) : false;
    const n = vendorCounts.get(slug) || 0;
    row.querySelector(".vendor-count").textContent = String(n);
    row.classList.toggle("zero", n === 0 && !box.checked);
  }
  container.classList.toggle("vendors-filtered", !!selectedVendors);

  const vt = container.querySelector("#vt-input");
  if (vt && document.activeElement !== vt) {
    const want = ui.vendorThreshold ? String(ui.vendorThreshold) : "";
    if (vt.value !== want) vt.value = want;
  }
}

/** Render removable chips for every active filter into `container`.
 *  Returns the number of chips rendered. */
export function renderActiveFilters(container, { ui, domains, tiers, vendors, lang }) {
  const chips = [];
  const label = (d) => lang === "ja" ? (d.label_ja || d.label_en) : d.label_en;
  for (const id of ui.domains || []) {
    const d = domains.find(x => x.id === id);
    if (d) chips.push({ key: "domains", value: id, text: label(d), color: d.color });
  }
  for (const id of ui.tiers || []) {
    const tier = tiers.find(x => x.id === id);
    if (tier) chips.push({ key: "tiers", value: id, text: label(tier), tier: id });
  }
  if (ui.examJa) chips.push({ key: "xja", text: t("facet_exam_ja", lang) });
  for (const id of ui.expBands || []) {
    const b = EXP_BANDS.find(x => x.id === id);
    if (b) chips.push({ key: "exp", value: id, text: `${t("facet_exp", lang)}: ${bandLabel(b, lang)}` });
  }
  for (const id of ui.costBands || []) {
    const b = COST_BANDS.find(x => x.id === id);
    if (b) chips.push({ key: "cost", value: id, text: `${bandLabel(b, lang)}` });
  }
  for (const slug of ui.vendors || []) {
    const v = vendors.find(x => x.slug === slug);
    chips.push({ key: "vendors", value: slug, text: v ? v.name : slug });
  }
  if (ui.searchFilter && ui.searchQuery) {
    chips.push({ key: "qf", text: `${t("search_filter_toggle", lang)}: “${ui.searchQuery}”` });
  }

  container.innerHTML = chips.map(c => `
    <button type="button" class="active-chip" data-key="${escapeHtml(c.key)}" ${c.value ? `data-value="${escapeHtml(c.value)}"` : ""}
            ${c.tier ? `data-tier="${escapeHtml(c.tier)}"` : ""} ${c.color ? `style="--chip-color:${escapeHtml(c.color)}"` : ""}
            title="${escapeHtml(t("ctx_deselect", lang))}">
      ${c.color ? `<i class="chip-swatch"></i>` : ""}<span>${escapeHtml(c.text)}</span><span class="x">×</span>
    </button>`).join("")
    + (chips.length > 1 ? `<button type="button" class="link active-clear" data-key="all">${escapeHtml(t("clear_filters", lang))}</button>` : "");
  container.hidden = chips.length === 0;

  if (!container.dataset.wired) {
    container.dataset.wired = "1";
    container.addEventListener("click", e => {
      const btn = e.target.closest("[data-key]");
      if (!btn) return;
      e.stopPropagation();
      const key = btn.dataset.key;
      const value = btn.dataset.value;
      const s = getState();
      switch (key) {
        case "all":     clearFilters(); break;
        case "domains": setState({ domains: toggleIn(s.domains, value) }); break;
        case "tiers":   setState({ tiers: toggleIn(s.tiers, value) }); break;
        case "exp":     setState({ exp: toggleIn(s.exp, value) }); break;
        case "cost":    setState({ cost: toggleIn(s.cost, value) }); break;
        case "vendors": setState({ vendors: toggleIn(s.vendors, value) }); break;
        case "xja":     setState({ xja: false }); break;
        case "qf":      setState({ qf: false }); break;
      }
    });
  }
  return chips.length;
}
