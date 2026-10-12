/**
 * Cert search with relevance ranking.
 *
 * Fields searched (all NFKC-normalized, lower-cased):
 *   abbr, id, name, name_ja, vendor name / slug,
 *   primary + secondary domain labels (en / ja) and ids,
 *   tier label (en / ja) and id.
 *
 * Intentionally NOT searched: scoring_factors, sources, third-party evals,
 * rationales — those produce too many spurious matches.
 *
 * Every whitespace-separated term must match somewhere; the score is the
 * sum of the best per-term score, so "aws security" ranks the AWS Security
 * Specialty above a GRC cert that merely mentions "security".
 */

function normalize(s) {
  if (!s) return "";
  return String(s).toLowerCase().normalize("NFKC");
}

/** Build and cache the per-cert search index. Call once per dataset
 *  (and again if domains / tiers change) — returns a Map<id, entry>. */
export function buildSearchIndex(certs, domains = [], tiers = []) {
  const domainById = new Map(domains.map(d => [d.id, d]));
  const tierById   = new Map(tiers.map(t => [t.id, t]));
  const index = new Map();
  for (const c of certs) {
    const tier = tierById.get(c?.evaluation?.computed_tier || "specialty");
    const dom  = domainById.get(c.domain);
    const secondary = (c.secondary_domains || []).map(id => domainById.get(id)).filter(Boolean);
    const words = s => normalize(s).split(/[^a-z0-9぀-ヿ一-鿿]+/).filter(Boolean);
    index.set(c.id, {
      abbr:      normalize(c.abbr),
      id:        normalize(c.id),
      idTail:    normalize(c.id.split(".").pop()),
      name:      normalize(c.name),
      nameWords: words(c.name),
      nameJa:    normalize(c.name_ja),
      vendor:    normalize(c.vendor?.name),
      vendorSlug: normalize(c.vendor?.slug),
      domain:    [dom?.id, dom?.label_en, dom?.label_ja].map(normalize).filter(Boolean),
      secondary: secondary.flatMap(d => [d.id, d.label_en, d.label_ja]).map(normalize).filter(Boolean),
      tier:      [tier?.id, tier?.label_en, tier?.label_ja].map(normalize).filter(Boolean),
    });
  }
  return index;
}

/** Score one term against one index entry. 0 = no match. */
function scoreTerm(e, term) {
  let best = 0;
  const bump = v => { if (v > best) best = v; };

  if (e.abbr === term)                         bump(100);
  else if (e.abbr.startsWith(term))            bump(80);
  else if (e.abbr.replace(/[\s_-]/g, "") === term.replace(/[\s_-]/g, "")) bump(78);
  else if (e.abbr.includes(term))              bump(60);

  if (e.idTail === term)                       bump(70);
  else if (e.id.includes(term))                bump(35);

  if (e.name.startsWith(term))                 bump(55);
  else if (e.nameWords.some(w => w.startsWith(term))) bump(45);
  else if (e.name.includes(term))              bump(30);

  if (e.nameJa) {
    if (e.nameJa.startsWith(term))             bump(55);
    else if (e.nameJa.includes(term))          bump(32);
  }

  if (e.vendor === term || e.vendorSlug === term) bump(50);
  else if (e.vendor.startsWith(term) || e.vendorSlug.startsWith(term)) bump(40);
  else if (e.vendor.includes(term))            bump(25);

  if (e.domain.some(d => d === term))          bump(22);
  else if (e.domain.some(d => d.includes(term))) bump(12);
  if (e.secondary.some(d => d.includes(term))) bump(8);

  if (e.tier.some(t => t === term))            bump(20);
  else if (e.tier.some(t => t.includes(term))) bump(10);

  return best;
}

/** Ranked search. Returns [] for an empty query, else [{cert, score}]
 *  sorted by score desc, then abbr asc. */
export function searchCerts(certs, index, query) {
  const q = normalize(query).trim();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const out = [];
  for (const c of certs) {
    const e = index.get(c.id);
    if (!e) continue;
    let total = 0;
    let ok = true;
    for (const t of terms) {
      const s = scoreTerm(e, t);
      if (s === 0) { ok = false; break; }
      total += s;
    }
    if (ok) out.push({ cert: c, score: total });
  }
  out.sort((a, b) => b.score - a.score || (a.cert.abbr || "").localeCompare(b.cert.abbr || ""));
  return out;
}

/** Returns Set<cert.id> for certs matching `query`, or null when the query
 *  is empty (caller should treat null as "no search active"). */
export function matchCertIds(certs, index, query) {
  const q = normalize(query).trim();
  if (!q) return null;
  return new Set(searchCerts(certs, index, query).map(r => r.cert.id));
}

/** Split `text` into [{str, hit}] fragments so the UI can <mark> the parts
 *  that match any of the query terms. Case / width-insensitive. */
export function highlightFragments(text, query) {
  const src = String(text ?? "");
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!src || !terms.length) return [{ str: src, hit: false }];
  const low = normalize(src);
  // NFKC can change string length for some full-width chars; only do
  // index-based highlighting when the lengths still line up.
  if (low.length !== src.length) return [{ str: src, hit: false }];
  const hits = new Array(src.length).fill(false);
  for (const t of terms) {
    let from = 0;
    while (from <= low.length - t.length) {
      const i = low.indexOf(t, from);
      if (i < 0) break;
      for (let k = i; k < i + t.length; k++) hits[k] = true;
      from = i + 1;
    }
  }
  const frags = [];
  let cur = { str: "", hit: hits[0] };
  for (let i = 0; i < src.length; i++) {
    if (hits[i] !== cur.hit) { frags.push(cur); cur = { str: "", hit: hits[i] }; }
    cur.str += src[i];
  }
  frags.push(cur);
  return frags;
}
