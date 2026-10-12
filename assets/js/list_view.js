import { t } from "./i18n.js";
import { setState } from "./url_state.js";
import { highlightFragments } from "./search.js";
import { tierOf, costUsd, expYears, examInJapanese } from "./facets.js";

/**
 * Sortable table of the currently visible certs — the "scan and compare"
 * companion to the matrix. Same filters, same search, same detail panel.
 */

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function marked(text, q) {
  if (!q) return escapeHtml(text);
  return highlightFragments(text, q)
    .map(f => f.hit ? `<mark>${escapeHtml(f.str)}</mark>` : escapeHtml(f.str)).join("");
}

const COLUMNS = [
  { id: "abbr",    key: "col_abbr",    sort: (c) => (c.abbr || "").toLowerCase() },
  { id: "name",    key: "col_name",    sort: (c, ctx) => (ctx.lang === "ja" ? (c.name_ja || c.name) : c.name).toLowerCase() },
  { id: "vendor",  key: "col_vendor",  sort: (c) => (c.vendor?.name || "").toLowerCase() },
  { id: "domain",  key: "col_domain",  sort: (c, ctx) => ctx.domainOrder.get(c.domain) ?? 99 },
  { id: "tier",    key: "col_tier",    sort: (c, ctx) => ctx.tierOrder.get(tierOf(c)) ?? 99, numeric: true },
  { id: "cost",    key: "col_cost",    sort: (c) => costUsd(c) ?? Infinity, numeric: true },
  { id: "langs",   key: "col_langs",   sort: (c) => examInJapanese(c) ? 0 : 1 },
  { id: "exp",     key: "col_exp",     sort: (c) => expYears(c), numeric: true },
  { id: "renewal", key: "col_renewal", sort: (c) => c.logistics?.renewal_years ?? Infinity, numeric: true },
];

export function parseSort(sort) {
  if (!sort) return { col: "tier", dir: "asc" };
  const [col, dir] = String(sort).split(":");
  const known = COLUMNS.some(c => c.id === col);
  return { col: known ? col : "tier", dir: dir === "desc" ? "desc" : "asc" };
}

export function renderListView(container, { certs, domains, tiers, ui, lang, query }) {
  const ctx = {
    lang,
    domainOrder: new Map(domains.map((d, i) => [d.id, i])),
    tierOrder:   new Map(tiers.map((tier, i) => [tier.id, i])),
  };
  const domainsById = new Map(domains.map(d => [d.id, d]));
  const tiersById   = new Map(tiers.map(tier => [tier.id, tier]));
  const { col, dir } = parseSort(ui.sort);
  const column = COLUMNS.find(c => c.id === col) || COLUMNS[4];

  const sorted = [...certs].sort((a, b) => {
    const ka = column.sort(a, ctx), kb = column.sort(b, ctx);
    // Missing values (Infinity) always sink to the bottom, whichever
    // direction is active — "sort by cost desc" should not lead with
    // certs that simply have no listed price.
    const na = ka === Infinity, nb = kb === Infinity;
    if (na !== nb) return na ? 1 : -1;
    let r = ka < kb ? -1 : ka > kb ? 1 : 0;
    if (r === 0) return (a.abbr || "").localeCompare(b.abbr || "");
    return dir === "desc" ? -r : r;
  });

  const head = COLUMNS.map(c => {
    const active = c.id === col;
    const arrow = active ? (dir === "asc" ? "▲" : "▼") : "";
    return `<th scope="col" class="${c.numeric ? "num" : ""}${active ? " sorted" : ""}">
      <button type="button" class="sort-btn" data-sort="${c.id}" title="${escapeHtml(t("sort_tooltip", lang))}" aria-sort="${active ? (dir === "asc" ? "ascending" : "descending") : "none"}">
        ${escapeHtml(t(c.key, lang))} <span class="sort-arrow">${arrow}</span>
      </button></th>`;
  }).join("");

  const rows = sorted.map(c => {
    const d = domainsById.get(c.domain);
    const tier = tiersById.get(tierOf(c));
    const name = lang === "ja" ? (c.name_ja || c.name) : c.name;
    const cost = costUsd(c);
    const langs = c.logistics?.languages || [];
    const exp = expYears(c);
    const ren = c.logistics?.renewal_years;
    const sel = ui.selectedId === c.id;
    return `<tr class="list-row${sel ? " selected" : ""}${c.japan_only ? " jp" : ""}" data-cert-id="${escapeHtml(c.id)}" tabindex="0" aria-selected="${sel}">
      <td class="c-abbr"><strong>${marked(c.abbr, query)}</strong>${c.japan_only ? ` <span class="jp-badge">JP</span>` : ""}${c.availability && c.availability !== "available" ? ` <span class="avail-badge avail-${escapeHtml(c.availability)}">${escapeHtml(c.availability.toUpperCase())}</span>` : ""}</td>
      <td class="c-name">${marked(name, query)}${lang === "ja" && c.name_ja ? `<div class="c-sub">${escapeHtml(c.name)}</div>` : ""}</td>
      <td class="c-vendor">${marked(c.vendor?.name || "", query)}</td>
      <td class="c-domain">${d ? `<span class="sr-domain"><i style="background:${escapeHtml(d.color || "#888")}"></i>${escapeHtml(lang === "ja" ? (d.label_ja || d.label_en) : d.label_en)}</span>` : ""}</td>
      <td class="c-tier">${tier ? `<span class="tier-pill" data-tier="${escapeHtml(tier.id)}">${escapeHtml(lang === "ja" ? (tier.label_ja || tier.label_en) : tier.label_en)}</span>` : ""}</td>
      <td class="num c-cost">${cost != null ? `$${cost.toLocaleString()}` : (c.logistics?.cost_local ? `<span class="muted small">${escapeHtml(c.logistics.cost_local)}</span>` : "—")}</td>
      <td class="c-langs">${langs.length ? langs.map(l => `<span class="lang-tag${/^ja/i.test(l) ? " ja" : ""}">${escapeHtml(l)}</span>`).join(" ") : "—"}</td>
      <td class="num c-exp">${exp > 0 ? exp : "—"}</td>
      <td class="num c-renewal">${ren != null ? `${ren}${t("unit_yrs", lang)}` : "—"}</td>
    </tr>`;
  }).join("");

  container.innerHTML = certs.length
    ? `<table class="cert-table"><colgroup>${COLUMNS.map(c => `<col class="col-${c.id}">`).join("")}</colgroup><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`
    : `<p class="list-empty">${escapeHtml(t("list_empty", lang))}</p>`;

  if (container.dataset.wired) return;
  container.dataset.wired = "1";
  container.addEventListener("click", e => {
    const sortBtn = e.target.closest(".sort-btn");
    if (sortBtn) {
      e.stopPropagation();
      const cur = parseSort(ui.sort);
      const id = sortBtn.dataset.sort;
      const nextDir = cur.col === id && cur.dir === "asc" ? "desc" : "asc";
      setState({ sort: `${id}:${nextDir}` });
      return;
    }
    const row = e.target.closest("tr[data-cert-id]");
    if (row) {
      e.stopPropagation();
      container.dispatchEvent(new CustomEvent("list-pick", { bubbles: true, detail: { id: row.dataset.certId } }));
    }
  });
  container.addEventListener("keydown", e => {
    const row = e.target.closest("tr[data-cert-id]");
    if (!row) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      container.dispatchEvent(new CustomEvent("list-pick", { bubbles: true, detail: { id: row.dataset.certId } }));
    }
  });
}
