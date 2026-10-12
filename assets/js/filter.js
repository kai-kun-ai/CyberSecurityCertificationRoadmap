import { getState, setState, subscribe } from "./url_state.js";
import { passesAll } from "./facets.js";

/**
 * Apply every facet (jp / vendors / domains / tiers / exam-language /
 * experience / cost / search-as-filter) to the full cert list. Facet
 * semantics live in facets.js so the side panel can reuse them for its
 * live counts.
 */
export function applyFilters(certs, ui) {
  return certs.filter(c => passesAll(c, ui));
}

/** Copy URL state into the ui object. Shared by app.js (syncFromUrl) and
 *  the filter listeners so there is exactly one mapping. */
export function syncUiFromUrl(ui, s = getState()) {
  ui.showJp        = !!s.jp;
  ui.labelLang     = s.lang === "ja" ? "ja" : "en";
  ui.vendors       = s.vendors;
  ui.domains       = s.domains;
  ui.tiers         = s.tiers;
  ui.examJa        = !!s.xja;
  ui.expBands      = s.exp;
  ui.costBands     = s.cost;
  ui.selectedId    = s.cert || null;
  ui.searchQuery   = s.q || "";
  ui.searchFilter  = !!s.qf;
  ui.view          = s.view === "list" ? "list" : "matrix";
  ui.sort          = s.sort || null;
  ui.zoom          = s.z || "m";
  ui.vendorThreshold = s.vt;
}

export function attachFilterListeners({ jpToggleBtn, langToggleBtn, state, onChange }) {
  const sync = () => {
    const s = getState();
    syncUiFromUrl(state, s);
    if (jpToggleBtn)   jpToggleBtn.setAttribute("aria-pressed",   String(state.showJp));
    if (langToggleBtn) langToggleBtn.setAttribute("aria-pressed", String(state.labelLang === "ja"));
    onChange();
  };
  sync();
  subscribe(sync);

  if (jpToggleBtn) {
    jpToggleBtn.addEventListener("click", () => setState({ jp: !getState().jp }));
  }
  if (langToggleBtn) {
    langToggleBtn.addEventListener("click", () => {
      const next = getState().lang === "ja" ? "en" : "ja";
      setState({ lang: next });
    });
  }
}
