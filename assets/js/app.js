import { loadAll } from "./loader.js";
import { renderGrid, vendorIndex, cellCounts, visibleAxes } from "./render.js";
import { applyFilters, attachFilterListeners, syncUiFromUrl } from "./filter.js";
import { initThemeToggle } from "./theme.js";
import { renderDetailPanel } from "./detail_panel.js";
import { drawArrows, buildInverseMap } from "./arrows.js";
import { getState, setState, subscribe, clearFilters } from "./url_state.js";
import { exportMatrixPNG } from "./export.js";
import { loadVersion, versionLabel } from "./version.js";
import { attachContextMenu } from "./context_menu.js";
import { buildSearchIndex, matchCertIds } from "./search.js";
import { attachSearchPalette } from "./search_palette.js";
import { updateSelectedOverlay } from "./selected_overlay.js";
import { renderOverview } from "./overview.js";
import { buildFilterPanel, syncFilterPanel, renderActiveFilters } from "./filter_panel.js";
import { renderListView } from "./list_view.js";
import { attachCardTooltip } from "./tooltip.js";
import { activeFacetCount } from "./facets.js";
import { t } from "./i18n.js";

const state = {
  domains: [],
  tiers: [],
  certs: [],
  byId: new Map(),
  domainsById: new Map(),
  tiersById: new Map(),
  inverseMap: new Map(),
  vendors: [],
  vendorCounts: new Map(),
  searchIndex: new Map(),
  ui: {
    showJp: false,
    labelLang: "en",
    vendors: null,
    domains: null,
    tiers: null,
    examJa: false,
    expBands: null,
    costBands: null,
    selectedId: null,
    // Default: panel is HIDDEN. Clicking a cert only updates highlight +
    // arrows; the panel is opt-in via the "Show details" button so the
    // arrow state is preserved while the user navigates between certs.
    panelDismissed: true,
    searchQuery: "",
    searchFilter: false,
    searchMatches: null,   // Set<id> | null, recomputed in rerender()
    view: "matrix",
    sort: null,
    zoom: "m",
    vendorThreshold: null,
    vendorCounts: new Map(),
  }
};

const grid = document.getElementById("grid");
const wrap = document.getElementById("matrix-wrap");
const listView = document.getElementById("list-view");
const counter = document.getElementById("cert-count");
const detail = document.getElementById("detail-panel");
const arrowsSvg = document.getElementById("arrows-overlay");
const selectedOverlay = document.getElementById("selected-overlay");
const sidePanel = document.getElementById("side-panel");
const sideOverview = document.getElementById("side-overview");
const facetPanel = document.getElementById("facet-panel");
const activeFilters = document.getElementById("active-filters");
const filtersToggle = document.getElementById("filters-toggle");
const filtersBadge = document.getElementById("filters-badge");
const topbar = document.querySelector(".topbar");
const topbarNav = document.getElementById("topbar-nav");
const mobileToolsToggle = document.getElementById("mobile-tools-toggle");
const mobileToolsMql = window.matchMedia("(max-width: 640px)");
const dockedSideMql  = window.matchMedia("(min-width: 1600px)");

const OVERVIEW_REL_CLASSES = ["rel-prereq", "rel-next", "rel-d2", "rel-d3", "rel-both"];
const SIDE_PREF_KEY = "csr.side-open";

let searchPalette = null;

function lang() { return state.ui.labelLang === "ja" ? "ja" : "en"; }

function rerender() {
  // Skip while data is still loading.
  if (state.byId.size === 0) return;

  state.ui.searchMatches = matchCertIds(state.certs, state.searchIndex, state.ui.searchQuery);
  const visible = applyFilters(state.certs, state.ui);
  const isList = state.ui.view === "list";

  document.body.classList.toggle("view-list", isList);
  listView.hidden = !isList;

  if (isList) {
    renderListView(listView, {
      certs: visible, domains: state.domains, tiers: state.tiers,
      ui: state.ui, lang: lang(), query: state.ui.searchQuery,
    });
  } else {
    renderGrid(grid, state.domains, state.tiers, visible, state.ui);
  }
  updateCounter(visible);
  applySearchHighlight();
  renderSideOverview(visible);
  syncFilterChrome();

  const isSelected = !!state.ui.selectedId && state.byId.has(state.ui.selectedId);
  const showPanel  = isSelected && !state.ui.panelDismissed;

  const wasPanelOpen = document.body.classList.contains("detail-open");
  document.body.classList.toggle("has-selection", isSelected);
  document.body.classList.toggle("detail-open",   showPanel);
  document.body.classList.toggle("panel-dismissed", isSelected && state.ui.panelDismissed);

  const selected = isSelected ? state.byId.get(state.ui.selectedId) : null;
  renderDetailPanel(detail, selected, state.byId, state.ui);
  detail.classList.toggle("open", showPanel);
  detail.setAttribute("aria-hidden", String(!showPanel));

  let didScrollSelection = false;
  const paintSelectionState = () => {
    redrawCurrentArrows();
    updateSelectedOverlay(selectedOverlay, grid, isList ? null : state.ui.selectedId, state.byId);
    updateOverviewCtaVisibility();
    requestAnimationFrame(updateOverviewCtaVisibility);
    if (state.ui.selectedId && !didScrollSelection) {
      didScrollSelection = true;
      scrollSelectedIntoView(state.ui.selectedId, showPanel && !wasPanelOpen);
    }
  };
  requestAnimationFrame(paintSelectionState);
  setTimeout(paintSelectionState, 140);
}

function updateCounter(visible) {
  const l = lang();
  const total = state.certs.length;
  const matches = state.ui.searchMatches;
  if (matches) {
    const visibleHits = visible.filter(c => matches.has(c.id)).length;
    counter.textContent = l === "ja"
      ? `${visibleHits} ${t("hits", l)} · 表示 ${visible.length} / ${total} 件`
      : `${visibleHits} ${t("hits", l)} · ${visible.length} of ${total} certs shown`;
  } else {
    counter.textContent = l === "ja"
      ? `${visible.length} / ${total} 件`
      : `${visible.length} of ${total} certs`;
  }
}

function renderSideOverview(visible) {
  if (!sideOverview) return;
  const { domains, tiers } = visibleAxes(state.domains, state.tiers, state.ui);
  const { counts, matched, selectedKey } = cellCounts(domains, tiers, visible, state.ui.searchMatches, state.ui.selectedId);
  renderOverview(sideOverview, { domains, tiers, counts, matched, selectedKey, lang: lang(), variant: "side" });
}

function syncFilterChrome() {
  const l = lang();
  syncFilterPanel(facetPanel, {
    certs: state.certs, ui: state.ui, domains: state.domains, tiers: state.tiers,
    vendors: state.vendors, lang: l,
  });
  renderActiveFilters(activeFilters, {
    ui: state.ui, domains: state.domains, tiers: state.tiers, vendors: state.vendors, lang: l,
  });
  const n = activeFacetCount(state.ui);
  if (filtersBadge) {
    filtersBadge.textContent = String(n);
    filtersBadge.hidden = n === 0;
  }
  document.body.classList.toggle("has-filters", n > 0);
}

function updateOverviewRelations() {
  const overviewCells = document.querySelectorAll(".overview-cell");
  if (!overviewCells.length) return;
  for (const cell of overviewCells) cell.classList.remove(...OVERVIEW_REL_CLASSES);

  const relByCell = new Map();
  for (const card of grid.querySelectorAll(".cert-card.rel-prereq, .cert-card.rel-next")) {
    const matrixCell = card.closest(".cell[data-tier][data-domain]");
    if (!matrixCell) continue;
    const key = `${matrixCell.dataset.tier}|${matrixCell.dataset.domain}`;
    const rel = relByCell.get(key) || { prereq: false, next: false, depth: 3 };
    rel.prereq ||= card.classList.contains("rel-prereq");
    rel.next   ||= card.classList.contains("rel-next");
    const depth = card.classList.contains("rel-d3") ? 3 : card.classList.contains("rel-d2") ? 2 : 1;
    rel.depth = Math.min(rel.depth, depth);
    relByCell.set(key, rel);
  }

  for (const [key, rel] of relByCell) {
    const [tier, domain] = key.split("|");
    const cells = document.querySelectorAll(
      `.overview-cell[data-overview-tier="${CSS.escape(tier)}"][data-overview-domain="${CSS.escape(domain)}"]`
    );
    for (const overviewCell of cells) {
      if (overviewCell.classList.contains("empty")) continue;
      if (rel.prereq) overviewCell.classList.add("rel-prereq");
      if (rel.next) overviewCell.classList.add("rel-next");
      if (rel.prereq && rel.next) overviewCell.classList.add("rel-both");
      if (rel.depth === 2) overviewCell.classList.add("rel-d2");
      if (rel.depth === 3) overviewCell.classList.add("rel-d3");
    }
  }
}

// ---------- Mobile tools drawer ----------

function isMobileToolsLayout() {
  return mobileToolsMql.matches;
}

function syncMobileToolsAccessibility() {
  if (!topbarNav) return;
  const shouldHide = isMobileToolsLayout() && !document.body.classList.contains("mobile-tools-open");
  topbarNav.toggleAttribute("inert", shouldHide);
  topbarNav.setAttribute("aria-hidden", String(shouldHide));
}

function setMobileToolsOpen(open) {
  const next = !!open && isMobileToolsLayout();
  if (topbar) topbar.classList.toggle("tools-open", next);
  document.body.classList.toggle("mobile-tools-open", next);
  if (mobileToolsToggle) mobileToolsToggle.setAttribute("aria-expanded", String(next));
  syncMobileToolsAccessibility();
}

// ---------- Side panel (overview + filters) ----------

function readSidePref() {
  try { return localStorage.getItem(SIDE_PREF_KEY); } catch (_) { return null; }
}
function writeSidePref(open) {
  try { localStorage.setItem(SIDE_PREF_KEY, open ? "1" : "0"); } catch (_) {}
}

function isSideOpen() { return document.body.classList.contains("side-open"); }

function setSideOpen(open, { remember = true } = {}) {
  document.body.classList.toggle("side-open", !!open);
  if (filtersToggle) filtersToggle.setAttribute("aria-pressed", String(!!open));
  if (open && isMobileToolsLayout()) setMobileToolsOpen(false);
  if (remember && dockedSideMql.matches) writeSidePref(!!open);
  // Grid width changed → arrows / overlay need re-measuring after layout.
  requestAnimationFrame(() => { redrawCurrentArrows(); updateSelectedOverlay(selectedOverlay, grid, state.ui.selectedId, state.byId); });
  setTimeout(() => { redrawCurrentArrows(); updateSelectedOverlay(selectedOverlay, grid, state.ui.selectedId, state.byId); }, 220);
}

function initSidePanel() {
  const pref = readSidePref();
  const open = dockedSideMql.matches && pref !== "0";
  setSideOpen(open, { remember: false });
}

// ---------- Overview jump ----------

function updateOverviewCtaVisibility() {
  const overview = grid.querySelector(".overview-in-grid");
  if (!overview) {
    document.body.classList.remove("overview-in-view");
    return;
  }
  const overviewRect = overview.getBoundingClientRect();
  const wrapRect = wrap.getBoundingClientRect();
  const isVisible = overviewRect.bottom > wrapRect.top + 8 && overviewRect.top < wrapRect.bottom - 8;
  document.body.classList.toggle("overview-in-view", isVisible);
}

function flashCell(target) {
  target.classList.remove("flash");
  void target.offsetWidth;
  target.classList.add("flash");
  setTimeout(() => target.classList.remove("flash"), 1600);
}

function jumpToOverviewCell(overviewCell) {
  const tier = overviewCell.dataset.overviewTier;
  const domain = overviewCell.dataset.overviewDomain;
  if (state.ui.view === "list") {
    // List view has no cells to scroll to: drill down instead.
    setState({ domains: [domain], tiers: [tier] });
    return;
  }
  const target = grid.querySelector(
    `.cell[data-tier="${CSS.escape(tier)}"][data-domain="${CSS.escape(domain)}"]`
  );
  if (!target) return;
  const stickyOffset = (grid.querySelector(".domain-head")?.getBoundingClientRect().height || 0)
    + (isMobileToolsLayout() ? (grid.querySelector(".tier-head")?.getBoundingClientRect().height || 0) : 0);
  const stickyLeft = grid.querySelector(".tier-head")?.getBoundingClientRect().width || 0;
  wrap.scrollTo({
    top:  Math.max(0, target.offsetTop - stickyOffset - 6),
    left: Math.max(0, target.offsetLeft - stickyLeft - 6),
    behavior: "smooth",
  });
  flashCell(target);
  if (!isMobileToolsLayout() && !dockedSideMql.matches) setSideOpen(false);
}

function scrollSelectedIntoView(certId, transitioning) {
  const findEl = () => state.ui.view === "list"
    ? listView.querySelector(`tr[data-cert-id="${CSS.escape(certId)}"]`)
    : grid.querySelector(`.cert-card[data-cert-id="${CSS.escape(certId)}"]`);

  const doScroll = () => {
    const el = findEl();
    if (el) el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  };

  if (!transitioning) { doScroll(); return; }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    document.body.removeEventListener("transitionend", onTransitionEnd);
    doScroll();
  };
  function onTransitionEnd(e) {
    if (e.target !== document.body) return;
    if (e.propertyName !== "padding-bottom") return;
    finish();
  }
  document.body.addEventListener("transitionend", onTransitionEnd);
  setTimeout(finish, 260);
}

async function renderVersion() {
  const target = document.getElementById("about-version");
  if (!target) return;
  const v = await loadVersion();
  const label = versionLabel(v);
  if (v.commit_url && v.commit !== "dev") {
    target.innerHTML = `<a href="${v.commit_url}" target="_blank" rel="noopener" title="View commit on GitHub">${label}</a>`;
  } else {
    target.textContent = label;
  }
}

async function bootstrap() {
  renderVersion();   // fire-and-forget
  try {
    const data = await loadAll("data/manifest.json");
    state.domains = data.domains;
    state.tiers   = data.tiers;
    state.certs   = data.certs;
    state.byId    = new Map(data.certs.map(c => [c.id, c]));
    state.domainsById = new Map(data.domains.map(d => [d.id, d]));
    state.tiersById   = new Map(data.tiers.map(tier => [tier.id, tier]));
    state.inverseMap = buildInverseMap(state.byId);
    state.searchIndex = buildSearchIndex(data.certs, data.domains, data.tiers);

    const vendors = vendorIndex(data.certs);
    state.vendors = vendors;
    state.vendorCounts = new Map(vendors.map(v => [v.slug, v.count]));
    state.ui.vendorCounts = state.vendorCounts;

    buildFilterPanel(facetPanel, { domains: state.domains, tiers: state.tiers, vendors, lang: lang() });

    initThemeToggle(document.getElementById("theme-toggle"));
    attachFilterListeners({
      jpToggleBtn:   document.getElementById("jp-toggle-btn"),
      langToggleBtn: document.getElementById("lang-toggle-btn"),
      state: state.ui,
      onChange: rerender,
    });
  } catch (err) {
    grid.innerHTML = `<p class="loading">Failed to load roadmap data: ${err.message}</p>`;
    console.error(err);
  } finally {
    wrap.removeAttribute("aria-busy");
  }
}

// ---------- Event wiring ----------

if (mobileToolsToggle) {
  mobileToolsToggle.addEventListener("click", () => {
    setMobileToolsOpen(!document.body.classList.contains("mobile-tools-open"));
  });
}

if (topbarNav) {
  topbarNav.addEventListener("click", e => {
    if (e.target.closest("a")) setMobileToolsOpen(false);
  });
}

syncMobileToolsAccessibility();

// Cert card click → toggle selection (highlight + arrows). The panel does
// NOT auto-open; user opens it via "Show details" CTA.
document.addEventListener("click", e => {
  if (document.body.classList.contains("mobile-tools-open") &&
      !e.target.closest("#topbar-nav, #mobile-tools-toggle, #side-panel")) {
    setMobileToolsOpen(false);
    return;
  }

  const card = e.target.closest("a.cert-card");
  if (card) {
    e.preventDefault();
    const id = card.dataset.certId;
    const sameAgain = state.ui.selectedId === id;
    setState({ cert: sameAgain ? null : id });   // panelDismissed untouched
    return;
  }

  const domainHead = e.target.closest(".domain-head[data-domain]");
  if (domainHead) {
    e.preventDefault();
    const id = domainHead.dataset.domain;
    const cur = state.ui.domains || [];
    const only = cur.length === 1 && cur[0] === id;
    setState({ domains: only ? null : [id] });
    return;
  }

  const overviewCell = e.target.closest("[data-overview-tier][data-overview-domain]");
  if (overviewCell) {
    e.preventDefault();
    jumpToOverviewCell(overviewCell);
    return;
  }

  // Click outside any card. Chrome (topbar / controls / footer / side
  // panel / detail panel / popovers) is excluded so toggles NEVER clear
  // the selection. Only a click on the matrix area itself deselects.
  if (state.ui.selectedId &&
      !e.target.closest("#detail-panel, .topbar, .controls, #about, #side-panel, .side-backdrop, .show-details-cta, .show-overview-cta, .overview, #list-view, .cert-tooltip, #cert-context-menu")) {
    state.ui.panelDismissed = true;   // reset the panel preference
    setState({ cert: null });
  }
});

// Detail panel "X" — dismiss panel only, keep arrows + highlight.
document.addEventListener("dismiss-panel", () => {
  if (!state.ui.selectedId) return;
  state.ui.panelDismissed = true;
  rerender();
});

// List view row pick → select + open details.
document.addEventListener("list-pick", e => {
  const id = e.detail?.id;
  if (!id) return;
  state.ui.panelDismissed = false;
  if (state.ui.selectedId === id) rerender();
  else setState({ cert: id });
});

/** Re-apply `.search-match` classes on cards based on current query. */
function applySearchHighlight() {
  const matched = state.ui.searchMatches;
  document.body.classList.toggle("has-search", !!matched);
  for (const card of grid.querySelectorAll(".cert-card")) {
    card.classList.toggle("search-match", !!matched && matched.has(card.dataset.certId));
  }
}

function redrawCurrentArrows() {
  if (state.ui.view === "list") {
    drawArrows(arrowsSvg, grid, null, state.byId, state.inverseMap);
    updateOverviewRelations();
    return;
  }
  drawArrows(arrowsSvg, grid, state.ui.selectedId, state.byId, state.inverseMap);
  updateOverviewRelations();
}

attachContextMenu({
  getState: () => ({ byId: state.byId, ui: state.ui }),
  onAction: async (action, cert) => {
    switch (action) {
      case "deselect":
        state.ui.panelDismissed = true;
        setState({ cert: null });
        break;
      case "copy-abbr":
        try {
          await navigator.clipboard.writeText(cert.abbr);
        } catch (_) {
          const ta = document.createElement("textarea");
          ta.value = cert.abbr;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); } catch (_) {}
          ta.remove();
        }
        break;
      case "show-details":
        state.ui.panelDismissed = false;
        if (state.ui.selectedId !== cert.id) setState({ cert: cert.id });
        else rerender();
        break;
      case "open-official": {
        const url = cert.official?.exam_url || cert.vendor?.url;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        break;
      }
    }
  },
});

attachCardTooltip(() => ({
  byId: state.byId, lang: lang(), tiersById: state.tiersById, domainsById: state.domainsById,
}));

// ESC: close popovers → clear search → close drawers → deselect.
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    const legend = document.getElementById("legend-popover");
    if (legend && !legend.hidden) { setLegendOpen(false); return; }
    const searchInput = document.getElementById("search-input");
    if (state.ui.searchQuery) {
      if (searchInput) searchInput.value = "";
      setState({ q: "", qf: false });
      return;
    }
    if (document.body.classList.contains("mobile-tools-open")) { setMobileToolsOpen(false); return; }
    if (isSideOpen() && !dockedSideMql.matches) { setSideOpen(false); return; }
    if (state.ui.selectedId) {
      state.ui.panelDismissed = true;
      setState({ cert: null });
    }
    return;
  }
  const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")
    || document.activeElement?.isContentEditable;
  if (inField || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "f" || e.key === "F") { e.preventDefault(); setSideOpen(!isSideOpen()); }
});

// ---------- Header search ----------
const searchInput = document.getElementById("search-input");
const searchClear = document.getElementById("search-clear");
const searchResults = document.getElementById("search-results");
if (searchInput && searchResults) {
  let debounce = 0;
  searchPalette = attachSearchPalette({
    input: searchInput,
    clearBtn: searchClear,
    resultsEl: searchResults,
    getCtx: () => ({
      certs: state.certs, index: state.searchIndex, lang: lang(),
      tiersById: state.tiersById, domainsById: state.domainsById,
      searchFilter: state.ui.searchFilter,
      visibleIds: new Set(applyFilters(state.certs, { ...state.ui, searchFilter: false }).map(c => c.id)),
    }),
    onQuery: q => {
      state.ui.searchQuery = q;
      clearTimeout(debounce);
      if (state.ui.searchFilter) {
        // Search doubles as a filter → the grid / list / counts all change.
        rerender();
      } else {
        state.ui.searchMatches = matchCertIds(state.certs, state.searchIndex, q);
        applySearchHighlight();
        updateCounter(applyFilters(state.certs, state.ui));
        renderSideOverview(applyFilters(state.certs, state.ui));
        if (state.ui.view === "list") rerender();
      }
      debounce = setTimeout(() => setState({ q }, { silent: true }), 200);
    },
    onSelect: id => {
      clearTimeout(debounce);
      state.ui.panelDismissed = false;
      const visibleNow = applyFilters(state.certs, state.ui).some(c => c.id === id);
      const patch = { q: searchInput.value, cert: id };
      if (!visibleNow) {
        // The pick is hidden by facets: lift them so "take me there" works.
        Object.assign(patch, { vendors: null, domains: null, tiers: null, xja: false, exp: null, cost: null, qf: false });
      }
      setState(patch);
    },
    onToggleFilter: () => setState({ q: searchInput.value, qf: !state.ui.searchFilter }),
  });
}
if (searchClear) {
  searchClear.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    setState({ q: "", qf: false });
    if (searchInput) searchInput.focus();
  });
}

// ---------- Filters toggle / side panel ----------
if (filtersToggle) {
  filtersToggle.addEventListener("click", () => setSideOpen(!isSideOpen()));
}
document.getElementById("side-close")?.addEventListener("click", () => setSideOpen(false));
document.getElementById("side-backdrop")?.addEventListener("click", () => setSideOpen(false));
dockedSideMql.addEventListener?.("change", () => initSidePanel());

// ---------- View switch ----------
document.getElementById("view-matrix-btn")?.addEventListener("click", () => setState({ view: "matrix" }));
document.getElementById("view-list-btn")?.addEventListener("click", () => setState({ view: "list" }));

// ---------- Zoom ----------
const ZOOMS = ["s", "m", "l"];
function applyZoomAttr() {
  const z = state.ui.zoom || "m";
  if (z === "m") document.documentElement.removeAttribute("data-zoom");
  else document.documentElement.setAttribute("data-zoom", z);
  const i = ZOOMS.indexOf(z);
  const out = document.getElementById("zoom-out");
  const inn = document.getElementById("zoom-in");
  if (out) out.disabled = i <= 0;
  if (inn) inn.disabled = i >= ZOOMS.length - 1;
}
document.getElementById("zoom-control")?.addEventListener("click", e => {
  const btn = e.target.closest(".zoom-btn");
  if (!btn) return;
  const i = ZOOMS.indexOf(state.ui.zoom || "m");
  const next = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + (btn.dataset.zoom === "in" ? 1 : -1)))];
  setState({ z: next === "m" ? null : next });
});

// ---------- Legend popover ----------
function setLegendOpen(open) {
  const pop = document.getElementById("legend-popover");
  const btn = document.getElementById("legend-toggle");
  if (!pop) return;
  pop.hidden = !open;
  if (btn) btn.setAttribute("aria-expanded", String(open));
}
document.getElementById("legend-toggle")?.addEventListener("click", e => {
  e.stopPropagation();
  const pop = document.getElementById("legend-popover");
  setLegendOpen(pop ? pop.hidden : false);
});
document.addEventListener("click", e => {
  const pop = document.getElementById("legend-popover");
  if (pop && !pop.hidden && !e.target.closest("#legend-popover, #legend-toggle")) setLegendOpen(false);
});

// ---------- PNG export ----------
const pngBtn = document.getElementById("png-export-btn");
if (pngBtn) {
  pngBtn.addEventListener("click", async () => {
    const orig = pngBtn.innerHTML;
    pngBtn.disabled = true;
    pngBtn.textContent = "…";
    const wasList = state.ui.view === "list";
    const wasSide = isSideOpen();
    try {
      if (wasList) { state.ui.view = "matrix"; renderGrid(grid, state.domains, state.tiers, applyFilters(state.certs, state.ui), state.ui); applySearchHighlight(); listView.hidden = true; document.body.classList.remove("view-list"); }
      if (wasSide) document.body.classList.remove("side-open");
      await exportMatrixPNG(redrawCurrentArrows);
    } catch (err) {
      console.error("PNG export failed:", err);
      alert("PNG export failed: " + err.message);
    } finally {
      if (wasSide) document.body.classList.add("side-open");
      if (wasList) { state.ui.view = "list"; }
      pngBtn.disabled = false;
      pngBtn.innerHTML = orig;
      rerender();
    }
  });
}

// ---------- Floating CTAs ----------
const showDetailsBtn = document.getElementById("show-details-btn");
if (showDetailsBtn) {
  showDetailsBtn.addEventListener("click", () => {
    if (!state.ui.selectedId) return;
    state.ui.panelDismissed = false;
    rerender();
  });
}
const showOverviewBtn = document.getElementById("show-overview-btn");
if (showOverviewBtn) {
  showOverviewBtn.addEventListener("click", () => {
    const overview = grid.querySelector(".overview-in-grid");
    if (overview) overview.scrollIntoView({ block: "start", inline: "nearest", behavior: "smooth" });
  });
}

window.addEventListener("resize", () => {
  if (!isMobileToolsLayout()) setMobileToolsOpen(false);
  else syncMobileToolsAccessibility();
  updateOverviewCtaVisibility();
  if (state.ui.selectedId) {
    redrawCurrentArrows();
    updateSelectedOverlay(selectedOverlay, grid, state.ui.view === "list" ? null : state.ui.selectedId, state.byId);
  } else {
    updateOverviewRelations();
  }
});

wrap.addEventListener("scroll", () => {
  requestAnimationFrame(updateOverviewCtaVisibility);
});

// ---------- URL state → UI ----------
function syncFromUrl() {
  syncUiFromUrl(state.ui, getState());
  const si = document.getElementById("search-input");
  if (si && si.value !== state.ui.searchQuery) si.value = state.ui.searchQuery;
  applyZoomAttr();
  updateChromeLabels();
  rerender();
  if (searchPalette) searchPalette.refresh();
}
subscribe(syncFromUrl);
syncFromUrl();

/** Localize static chrome on every language change. */
function updateChromeLabels() {
  const l = lang();
  const set = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key, l);
  };
  const title = (id, key) => {
    const el = document.getElementById(id);
    if (el) { el.title = t(key, l); el.setAttribute("aria-label", t(key, l)); }
  };
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n, l);

  set("lg-prereq", "legend_prereq");
  set("lg-next",   "legend_next");
  set("lg-depth",  "legend_depth");
  set("lg-hint",   "legend_hint");
  set("lg-axes",   "legend_axes");
  set("lg-jp",     "legend_jp_dot");
  set("lg-avail",  "legend_avail");
  set("legend-title", "legend_title");
  set("legend-shortcuts-title", "legend_shortcuts");
  set("lg-k-search",  "shortcut_search");
  set("lg-k-filters", "shortcut_filters");
  set("lg-k-arrows",  "shortcut_arrows");
  set("lg-k-esc",     "shortcut_esc");
  set("legend-btn-label", "legend");
  set("side-title", "sidebar_title");
  set("zoom-label", "zoom_label");
  title("zoom-in",  "zoom_in");
  title("zoom-out", "zoom_out");
  title("side-close", "sidebar_close");
  title("filters-toggle", "filters_tooltip");
  title("view-matrix-btn", "view_matrix_tooltip");
  title("view-list-btn", "view_list_tooltip");
  title("jp-toggle-btn", "jp_toggle_tooltip");
  title("lang-toggle-btn", "lang_toggle_tooltip");
  title("theme-toggle", "theme_tooltip");

  const si = document.getElementById("search-input");
  if (si) { si.placeholder = t("search_placeholder", l); si.setAttribute("aria-label", t("search_aria", l)); }

  const langLabel = document.querySelector(".lang-label");
  if (langLabel) langLabel.textContent = l === "ja" ? "あ 日本語" : "A English";

  const png = document.getElementById("png-export-btn");
  if (png) {
    png.innerHTML = `📷 <span class="btn-label">PNG</span>`;
    png.title = t("export_png", l);
  }
  const showLabel = document.querySelector(".show-details-label");
  if (showLabel) showLabel.textContent = t("show_details", l);
  const overviewBtn = document.getElementById("show-overview-btn");
  if (overviewBtn) {
    overviewBtn.title = t("show_overview_tooltip", l);
    overviewBtn.setAttribute("aria-label", t("show_overview_tooltip", l));
  }
  const overviewLabel = document.querySelector(".show-overview-label");
  if (overviewLabel) overviewLabel.textContent = t("show_overview", l);
  const toolsToggle = document.getElementById("mobile-tools-toggle");
  if (toolsToggle) {
    toolsToggle.title = t("tools_tooltip", l);
    toolsToggle.setAttribute("aria-label", t("tools_tooltip", l));
  }
  const toolsLabel = document.querySelector(".mobile-tools-label");
  if (toolsLabel) toolsLabel.textContent = t("tools", l);
  document.documentElement.lang = l;
}

updateChromeLabels();
initSidePanel();
bootstrap();
