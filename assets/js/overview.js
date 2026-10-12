import { t } from "./i18n.js";

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const DOMAIN_SHORT = {
  "governance-risk": "GRC",
  "security-architecture": "Arc",
  iam: "IAM",
  "network-defense": "Net",
  "endpoint-mobile": "End",
  "cloud-security": "Cld",
  "application-appsec": "App",
  "offensive-redteam": "Red",
  "incident-forensics": "IR",
  "threat-intel": "CTI",
  "ot-ics-iot": "OT",
  "privacy-data-protection": "Pri",
};

const TIER_SHORT_EN = {
  specialty: "Spec", expert: "Exp", professional: "Pro",
  associate: "Assoc", foundational: "Found", introductory: "Intro",
};
const TIER_SHORT_JA = {
  specialty: "特化", expert: "上級", professional: "プロ",
  associate: "中級", foundational: "基礎", introductory: "入門",
};

export function shortDomainLabel(domain) {
  return DOMAIN_SHORT[domain.id] || domain.id.slice(0, 4);
}

export function shortTierLabel(tier, lang) {
  const map = lang === "ja" ? TIER_SHORT_JA : TIER_SHORT_EN;
  return map[tier.id] || (lang === "ja" ? (tier.label_ja || tier.label_en) : tier.label_en).slice(0, 5);
}

export function domainLabel(d, lang) {
  return lang === "ja" ? (d.label_ja || d.label_en) : d.label_en;
}
export function tierLabel(tier, lang) {
  return lang === "ja" ? (tier.label_ja || tier.label_en) : tier.label_en;
}

/**
 * Tier × domain heat-map ("俯瞰図"). Used twice:
 *   - inside the grid on phones (replaces the column headers), and
 *   - in the desktop side panel, where it doubles as a minimap of the
 *     current filter / search result.
 *
 * `counts`  : Map<"tier|domain", number>  — visible certs per cell
 * `matched` : Map<"tier|domain", number> | null — search hits per cell
 * `selectedKey` : "tier|domain" of the selected cert, or null
 */
export function renderOverview(container, { domains, tiers, counts, matched, selectedKey, lang, variant }) {
  const isSearch = !!matched;
  container.innerHTML = "";
  container.className = `overview overview-in-${variant || "grid"}`;
  container.setAttribute("aria-label", t("overview_aria", lang));

  const head = document.createElement("div");
  head.className = "overview-head";
  head.innerHTML = `
    <span class="overview-title">${escapeHtml(t("overview_title", lang))}</span>
    <span class="overview-note">${escapeHtml(variant === "side" ? t("overview_hint_desktop", lang) : t("overview_note", lang))}</span>
  `;
  container.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "overview-matrix";
  grid.style.setProperty("--overview-domain-count", domains.length);

  const corner = document.createElement("div");
  corner.className = "overview-corner";
  corner.textContent = t("overview_tier_axis", lang);
  grid.appendChild(corner);

  for (const d of domains) {
    const h = document.createElement("div");
    h.className = "overview-domain";
    h.title = domainLabel(d, lang);
    h.style.setProperty("--domain-color", d.color || "#888");
    h.textContent = shortDomainLabel(d);
    grid.appendChild(h);
  }

  let maxCount = 1;
  for (const v of counts.values()) if (v > maxCount) maxCount = v;

  for (const tier of tiers) {
    const rowHead = document.createElement("div");
    rowHead.className = "overview-tier";
    rowHead.dataset.tier = tier.id;
    rowHead.textContent = shortTierLabel(tier, lang);
    rowHead.title = tierLabel(tier, lang);
    grid.appendChild(rowHead);

    for (const d of domains) {
      const key = `${tier.id}|${d.id}`;
      const count = counts.get(key) || 0;
      const hits  = isSearch ? (matched.get(key) || 0) : null;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "overview-cell";
      cell.dataset.overviewTier = tier.id;
      cell.dataset.overviewDomain = d.id;
      cell.style.setProperty("--domain-color", d.color || "#888");
      // Density tint scaled to the densest visible cell so the heat map
      // stays readable after a narrow filter leaves only a few certs.
      const ratio = count / maxCount;
      cell.style.setProperty("--density", `${Math.round(12 + ratio * 60)}%`);
      const label = `${tierLabel(tier, lang)} / ${domainLabel(d, lang)}: ${count}`
        + (isSearch ? ` (${hits} ${t("hits", lang)})` : "");
      cell.title = label;
      cell.setAttribute("aria-label", label);
      if (count === 0) {
        cell.classList.add("empty");
        cell.disabled = true;
      } else if (isSearch) {
        cell.textContent = String(hits);
        cell.classList.add(hits > 0 ? "has-hits" : "no-hits");
      } else {
        cell.textContent = count > 99 ? "99+" : String(count);
      }
      if (selectedKey === key) cell.classList.add("selected");
      grid.appendChild(cell);
    }
  }
  container.appendChild(grid);
}
