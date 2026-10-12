import { t } from "./i18n.js";
import { tierOf, costUsd, examInJapanese, expYears } from "./facets.js";

/**
 * Fast hover tooltip for cert cards. The native `title` attribute takes
 * ~1 s to appear and cannot show structured content; this one shows
 * abbr / full name / vendor / tier / domain / cost after 120 ms and
 * follows the card. Pointer-only: touch devices get the detail panel.
 */

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

let el = null;
let timer = 0;
let currentCard = null;

function ensure() {
  if (el) return el;
  el = document.createElement("div");
  el.className = "cert-tooltip";
  el.setAttribute("role", "tooltip");
  el.hidden = true;
  document.body.appendChild(el);
  return el;
}

function hide() {
  clearTimeout(timer);
  timer = 0;
  currentCard = null;
  if (el) el.hidden = true;
}

/** Hide what is showing but keep a pending timer: a scroll that happens
 *  while the pointer rests on a card (wheel, or scrollIntoView) should
 *  not cancel the tooltip that is about to appear. */
function hideVisible() {
  if (el) el.hidden = true;
}

function position(card) {
  const r = card.getBoundingClientRect();
  const tip = ensure();
  tip.hidden = false;
  const tr = tip.getBoundingClientRect();
  const margin = 8;
  let left = r.left + r.width / 2 - tr.width / 2;
  left = Math.max(margin, Math.min(window.innerWidth - tr.width - margin, left));
  let top = r.bottom + 6;
  let above = false;
  if (top + tr.height > window.innerHeight - margin) {
    top = r.top - tr.height - 6;
    above = true;
  }
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top  = `${Math.round(top)}px`;
  tip.classList.toggle("above", above);
}

function render(cert, ctx) {
  const lang = ctx.lang;
  const tier = ctx.tiersById.get(tierOf(cert));
  const dom  = ctx.domainsById.get(cert.domain);
  const name = lang === "ja" ? (cert.name_ja || cert.name) : cert.name;
  const altName = lang === "ja" && cert.name_ja ? cert.name : (lang === "en" && cert.name_ja ? cert.name_ja : "");
  const cost = costUsd(cert);
  const exp  = expYears(cert);
  const facts = [];
  if (cost != null) facts.push(`$${cost.toLocaleString()}`);
  else if (cert.logistics?.cost_local) facts.push(escapeHtml(cert.logistics.cost_local));
  if (exp > 0) facts.push(`${exp}${t("unit_yrs", lang)} ${t("experience_yrs", lang)}`.replace(/\s+/g, " "));
  if (examInJapanese(cert)) facts.push(`<span class="tt-ja">${escapeHtml(t("exam_ja_badge", lang))}</span>`);
  const avail = cert.availability && cert.availability !== "available"
    ? `<span class="avail-badge avail-${escapeHtml(cert.availability)}">${escapeHtml(cert.availability.toUpperCase())}</span>` : "";

  ensure().innerHTML = `
    <div class="tt-head">
      <span class="tt-abbr">${escapeHtml(cert.abbr)}</span>
      ${cert.japan_only ? `<span class="jp-badge">JP</span>` : ""}
      ${avail}
      ${tier ? `<span class="tier-pill" data-tier="${escapeHtml(tier.id)}">${escapeHtml(lang === "ja" ? (tier.label_ja || tier.label_en) : tier.label_en)}</span>` : ""}
    </div>
    <div class="tt-name">${escapeHtml(name)}</div>
    ${altName ? `<div class="tt-alt">${escapeHtml(altName)}</div>` : ""}
    <div class="tt-meta">
      <span class="tt-vendor">${escapeHtml(cert.vendor?.name || "")}</span>
      ${dom ? `<span class="tt-domain"><i style="background:${escapeHtml(dom.color || "#888")}"></i>${escapeHtml(lang === "ja" ? (dom.label_ja || dom.label_en) : dom.label_en)}</span>` : ""}
    </div>
    ${facts.length ? `<div class="tt-facts">${facts.join(" · ")}</div>` : ""}
    <div class="tt-hint">${escapeHtml(t("tooltip_hint", lang))}</div>
  `;
}

/**
 * ctx getter must return { byId, lang, tiersById, domainsById }.
 */
export function attachCardTooltip(getCtx) {
  const fine = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
  const enabled = () => !fine || fine.matches;

  document.addEventListener("pointerover", e => {
    if (!enabled()) return;
    const card = e.target.closest(".cert-card[data-cert-id]");
    if (!card || card === currentCard) return;
    hide();
    currentCard = card;
    timer = setTimeout(() => {
      const ctx = getCtx();
      const cert = ctx.byId.get(card.dataset.certId);
      if (!cert || !document.body.contains(card)) return;
      render(cert, ctx);
      position(card);
    }, 120);
  });
  document.addEventListener("pointerout", e => {
    const card = e.target.closest(".cert-card[data-cert-id]");
    if (!card) return;
    const to = e.relatedTarget;
    if (to && card.contains(to)) return;
    hide();
  });
  document.addEventListener("pointerdown", hide, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") hide(); });
  window.addEventListener("scroll", hideVisible, true);
  window.addEventListener("resize", hide);
}
