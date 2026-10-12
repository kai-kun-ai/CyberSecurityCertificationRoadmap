/**
 * Facet definitions shared by the filter predicate (filter.js) and the
 * filter side panel (filter_panel.js).
 *
 * A facet value is a short URL-safe token; `test(cert)` decides membership.
 * Band facets (experience / cost) are OR-ed within the facet and AND-ed
 * across facets, like every faceted-search UI people already know.
 */

export function tierOf(cert) {
  return cert?.evaluation?.computed_tier || "specialty";
}

export const EXP_BANDS = [
  { id: "0",   label_en: "No experience req.", label_ja: "実務経験不要", test: y => !y },
  { id: "1-2", label_en: "1–2 yrs",            label_ja: "1〜2年",       test: y => y >= 1 && y <= 2 },
  { id: "3-5", label_en: "3–5 yrs",            label_ja: "3〜5年",       test: y => y >= 3 && y <= 5 },
  { id: "6+",  label_en: "6+ yrs",             label_ja: "6年以上",      test: y => y >= 6 },
];

export const COST_BANDS = [
  { id: "lt300",    label_en: "< $300",        label_ja: "$300 未満",     test: c => c != null && c < 300 },
  { id: "300-600",  label_en: "$300 – 600",    label_ja: "$300〜600",     test: c => c != null && c >= 300 && c < 600 },
  { id: "600-1000", label_en: "$600 – 1,000",  label_ja: "$600〜1,000",   test: c => c != null && c >= 600 && c < 1000 },
  { id: "gte1000",  label_en: "$1,000 +",      label_ja: "$1,000 以上",   test: c => c != null && c >= 1000 },
  { id: "unknown",  label_en: "Not listed",    label_ja: "未記載",        test: c => c == null },
];

export function expYears(cert) {
  const y = cert?.prerequisites?.experience_years;
  return (typeof y === "number" && Number.isFinite(y)) ? y : 0;
}

export function costUsd(cert) {
  const c = cert?.logistics?.cost_usd;
  return (typeof c === "number" && Number.isFinite(c)) ? c : null;
}

export function examInJapanese(cert) {
  return (cert?.logistics?.languages || []).some(l => /^ja/i.test(String(l)));
}

function inBands(bands, selected, value) {
  if (!selected || !selected.length) return true;
  const set = new Set(selected);
  return bands.some(b => set.has(b.id) && b.test(value));
}

/**
 * Per-facet predicates. Each takes (cert, ui) and returns true when the
 * cert passes THAT facet. `applyFilters` ANDs them; the panel's live
 * counts evaluate "all facets except mine" to show what each click adds.
 */
export const FACET_PREDICATES = {
  jp:      (c, ui) => !c.japan_only || !!ui.showJp,
  vendors: (c, ui) => !ui.vendors || !ui.vendors.length || ui.vendors.includes(c.vendor?.slug),
  domains: (c, ui) => !ui.domains || !ui.domains.length || ui.domains.includes(c.domain),
  tiers:   (c, ui) => !ui.tiers   || !ui.tiers.length   || ui.tiers.includes(tierOf(c)),
  xja:     (c, ui) => !ui.examJa || examInJapanese(c),
  exp:     (c, ui) => inBands(EXP_BANDS,  ui.expBands,  expYears(c)),
  cost:    (c, ui) => inBands(COST_BANDS, ui.costBands, costUsd(c)),
  search:  (c, ui) => !ui.searchFilter || !ui.searchMatches || ui.searchMatches.has(c.id),
};

export function passesAll(cert, ui, except = null) {
  for (const [key, pred] of Object.entries(FACET_PREDICATES)) {
    if (key === except) continue;
    if (!pred(cert, ui)) return false;
  }
  return true;
}

/** Count how many certs would be visible for each value of a facet if the
 *  user clicked it (i.e. all OTHER facets applied). Returns Map<value, n>. */
export function facetCounts(certs, ui, facet, valueOf) {
  const out = new Map();
  for (const c of certs) {
    if (!passesAll(c, ui, facet)) continue;
    const vals = valueOf(c);
    for (const v of (Array.isArray(vals) ? vals : [vals])) {
      if (v == null) continue;
      out.set(v, (out.get(v) || 0) + 1);
    }
  }
  return out;
}

/** Number of active filter values (one per chip) for the toolbar badge. */
export function activeFacetCount(ui) {
  let n = 0;
  n += (ui.vendors || []).length;
  n += (ui.domains || []).length;
  n += (ui.tiers || []).length;
  if (ui.examJa) n++;
  n += (ui.expBands || []).length;
  n += (ui.costBands || []).length;
  if (ui.searchFilter && ui.searchQuery) n++;
  return n;
}
