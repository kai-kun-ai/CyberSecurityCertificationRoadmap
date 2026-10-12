import { t } from "./i18n.js";
import { renderOverview, domainLabel, tierLabel, shortDomainLabel } from "./overview.js";
import { tierOf } from "./facets.js";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Build a vendor list for the filter panel: { slug, name, count } sorted by count desc.
 * Counts are taken from the FULL cert set (not filtered) so the panel is stable.
 */
export function vendorIndex(allCerts) {
  const map = new Map();
  for (const c of allCerts) {
    const slug = c.vendor?.slug;
    if (!slug) continue;
    if (!map.has(slug)) map.set(slug, { slug, name: c.vendor.name, count: 0 });
    map.get(slug).count++;
  }
  return Array.from(map.values()).sort((a, b) =>
    b.count - a.count || a.name.localeCompare(b.name));
}

/** Per-cell counts for the overview heat map.
 *  Returns { counts: Map<"tier|domain", n>, matched: Map|null, selectedKey }. */
export function cellCounts(domains, tiers, certs, matchSet, selectedId) {
  const counts = new Map();
  const matched = matchSet ? new Map() : null;
  let selectedKey = null;
  for (const tier of tiers) for (const d of domains) counts.set(`${tier.id}|${d.id}`, 0);
  for (const c of certs) {
    const key = `${tierOf(c)}|${c.domain}`;
    if (!counts.has(key)) continue;
    counts.set(key, counts.get(key) + 1);
    if (matched && matchSet.has(c.id)) matched.set(key, (matched.get(key) || 0) + 1);
    if (selectedId && c.id === selectedId) selectedKey = key;
  }
  return { counts, matched, selectedKey };
}

/** Domains / tiers that are currently visible as matrix columns / rows. */
export function visibleAxes(domains, tiers, ui) {
  const ds = ui.domains && ui.domains.length ? domains.filter(d => ui.domains.includes(d.id)) : domains;
  const ts = ui.tiers && ui.tiers.length ? tiers.filter(tier => ui.tiers.includes(tier.id)) : tiers;
  return { domains: ds, tiers: ts };
}

export function renderGrid(root, allDomains, allTiers, certs, ui) {
  root.innerHTML = "";
  const lang = ui.labelLang === "ja" ? "ja" : "en";
  const { domains, tiers } = visibleAxes(allDomains, allTiers, ui);
  const focused = !!(ui.domains && ui.domains.length);

  // Vendor-highlight: tint cards whose vendor publishes ≥ threshold certs.
  const vt = Number.isFinite(ui.vendorThreshold) && ui.vendorThreshold > 0
    ? ui.vendorThreshold : 0;
  const vendorCounts = ui.vendorCounts || new Map();
  const isProminent = slug => vt > 0 && (vendorCounts.get(slug) || 0) >= vt;

  // Per-domain cert counts → sqrt-weighted column fractions, so dense
  // domains get more width without dominating sparse ones.
  const countsByDomain = new Map(domains.map(d => [d.id, 0]));
  const countsByTier   = new Map(tiers.map(tier => [tier.id, 0]));
  for (const c of certs) {
    if (countsByDomain.has(c.domain)) countsByDomain.set(c.domain, countsByDomain.get(c.domain) + 1);
    const tid = tierOf(c);
    if (countsByTier.has(tid)) countsByTier.set(tid, countsByTier.get(tid) + 1);
  }
  const fractions = domains.map(d => {
    const n = countsByDomain.get(d.id) || 0;
    return Math.max(2, Math.sqrt(Math.max(n, 4)) * 1.4);
  });
  const colTemplate = fractions.map(f => `minmax(56px, ${f.toFixed(2)}fr)`).join(" ");
  root.style.gridTemplateColumns = `78px ${colTemplate}`;
  root.classList.toggle("few-domains", domains.length <= 3);

  // Header row
  const corner = document.createElement("div");
  corner.className = "corner";
  corner.textContent = "Tier ↓ / Domain →";
  root.appendChild(corner);

  for (const d of domains) {
    const h = document.createElement("button");
    h.type = "button";
    h.className = "domain-head";
    h.dataset.domain = d.id;
    const isFocused = focused && ui.domains.includes(d.id);
    if (isFocused) h.classList.add("focused");
    h.title = `${domainLabel(d, lang)} (${countsByDomain.get(d.id) || 0}) — ${isFocused && ui.domains.length === 1 ? t("domain_unfocus_tooltip", lang) : t("domain_focus_tooltip", lang)}`;
    h.innerHTML = `
      <span class="dh-top"><span class="swatch" style="background:${escapeHtml(d.color || "#888")}"></span><span class="dh-code">${escapeHtml(shortDomainLabel(d))}</span><span class="dh-count">${countsByDomain.get(d.id) || 0}</span></span>
      <span class="label">${escapeHtml(domainLabel(d, lang))}</span>
    `;
    root.appendChild(h);
  }

  // Bucket certs into (tier, domain) cells.
  const buckets = new Map();
  for (const tier of tiers) for (const d of domains) buckets.set(`${tier.id}|${d.id}`, []);
  for (const c of certs) {
    const key = `${tierOf(c)}|${c.domain}`;
    if (buckets.has(key)) buckets.get(key).push(c);
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => {
      if (!!a.japan_only !== !!b.japan_only) return a.japan_only ? 1 : -1;
      return (a.abbr || "").localeCompare(b.abbr || "");
    });
  }

  // In-grid overview (phones: replaces the column header row).
  const overview = document.createElement("section");
  const { counts, matched, selectedKey } = cellCounts(domains, tiers, certs, ui.searchMatches, ui.selectedId);
  renderOverview(overview, { domains, tiers, counts, matched, selectedKey, lang, variant: "grid" });
  root.appendChild(overview);

  // Body rows
  for (const tier of tiers) {
    const head = document.createElement("div");
    head.className = "tier-head";
    head.dataset.tier = tier.id;
    head.innerHTML = `<span class="th-label">${escapeHtml(tierLabel(tier, lang))}</span><span class="th-count">${countsByTier.get(tier.id) || 0}</span>`;
    root.appendChild(head);

    for (const d of domains) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.tier = tier.id;
      cell.dataset.domain = d.id;
      cell.dataset.domainLabel = domainLabel(d, lang);
      cell.style.setProperty("--domain-color", d.color || "#888");

      const list = buckets.get(`${tier.id}|${d.id}`) || [];
      if (list.length === 0) cell.classList.add("empty");
      else if (list.length >= 18) cell.classList.add("cell-very-dense");
      else if (list.length >= 10) cell.classList.add("cell-dense");
      else if (list.length >= 5)  cell.classList.add("cell-medium");

      for (const c of list) {
        const card = document.createElement("a");
        const availability = c.availability || "available";
        const classes = ["cert-card"];
        if (c.japan_only) classes.push("jp");
        if (availability !== "available") classes.push("unavail", `unavail-${availability}`);
        if (ui.selectedId === c.id) classes.push("selected");
        if (isProminent(c.vendor?.slug)) classes.push("vendor-prominent");
        card.className = classes.join(" ");
        card.href = `?cert=${encodeURIComponent(c.id)}`;
        card.dataset.certId = c.id;
        const name = lang === "ja" ? (c.name_ja || c.name) : c.name;
        const availSuffix = availability !== "available" ? ` [${availability.toUpperCase()}]` : "";
        // Screen readers get the full identity; sighted users get the
        // custom tooltip (tooltip.js) — no native title, it is too slow
        // and would double up.
        card.setAttribute("aria-label", `${c.abbr} (${c.vendor?.name || ""}) — ${name}${availSuffix}`);
        card.innerHTML = `<span class="abbr">${escapeHtml(c.abbr)}</span><span class="vendor">${escapeHtml(c.vendor?.name || "")}</span><span class="name">${escapeHtml(name)}</span>`;
        cell.appendChild(card);
      }
      root.appendChild(cell);
    }
  }
}
