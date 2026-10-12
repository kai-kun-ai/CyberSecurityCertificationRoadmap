/**
 * Single source of truth for filter / selection / view state in the URL.
 *
 * Param shape (all optional):
 *   ?theme=light|dark
 *   ?lang=en|ja
 *   ?jp=1                       (show Japan-only certs)
 *   ?v=isc2,offsec,giac         (vendor filter; absent = no filter)
 *   ?d=cloud-security,iam       (domain filter; absent = all domains)
 *   ?t=associate,professional   (tier filter; absent = all tiers)
 *   ?xja=1                      (only certs whose exam is offered in Japanese)
 *   ?exp=0,1-2,3-5,6+           (required-experience bands)
 *   ?cost=lt300,300-600,600-1000,gte1000,unknown  (USD cost bands)
 *   ?cert=isc2.cissp            (selected cert id)
 *   ?q=GIAC                     (live search query)
 *   ?qf=1                       (search acts as a filter: hide non-matches)
 *   ?view=matrix|list           (main view; matrix is the default)
 *   ?sort=cost:desc             (list-view sort column + direction)
 *   ?z=s|m|l                    (matrix density: small / medium / large)
 *   ?vt=10                      (vendor-highlight threshold: tint cards whose
 *                                vendor publishes ≥ vt certs; 0/missing = off)
 *
 * Updates use history.replaceState so the back/forward stack isn't polluted
 * with every keystroke; the URL still bookmarks correctly.
 */

const KEYS = ["theme", "lang", "jp", "v", "d", "t", "xja", "exp", "cost",
              "cert", "q", "qf", "view", "sort", "z", "vt"];

const LIST_KEYS = { v: "vendors", d: "domains", t: "tiers", exp: "exp", cost: "cost" };

function readList(sp, key) {
  if (!sp.has(key)) return null;
  const items = (sp.get(key) || "").split(",").map(s => s.trim()).filter(Boolean);
  return items.length ? items : null;
}

function readParams() {
  const sp = new URLSearchParams(window.location.search);
  let vt = null;
  if (sp.has("vt")) {
    const n = parseInt(sp.get("vt"), 10);
    if (Number.isFinite(n) && n > 0) vt = n;
  }
  const view = sp.get("view") === "list" ? "list" : "matrix";
  const z = ["s", "m", "l"].includes(sp.get("z")) ? sp.get("z") : null;
  return {
    theme:   sp.get("theme") || null,
    lang:    sp.get("lang") || null,
    jp:      sp.get("jp") === "1",
    vendors: readList(sp, "v"),
    domains: readList(sp, "d"),
    tiers:   readList(sp, "t"),
    xja:     sp.get("xja") === "1",
    exp:     readList(sp, "exp"),
    cost:    readList(sp, "cost"),
    cert:    sp.get("cert") || null,
    q:       sp.get("q") || "",
    qf:      sp.get("qf") === "1",
    view,
    sort:    sp.get("sort") || null,
    z,
    vt,
  };
}

function writeParams(state) {
  const sp = new URLSearchParams(window.location.search);
  for (const k of KEYS) sp.delete(k);
  if (state.theme)             sp.set("theme", state.theme);
  if (state.lang)              sp.set("lang", state.lang);
  if (state.jp)                sp.set("jp", "1");
  for (const [param, field] of Object.entries(LIST_KEYS)) {
    const list = state[field];
    if (Array.isArray(list) && list.length) sp.set(param, list.join(","));
  }
  if (state.xja)               sp.set("xja", "1");
  if (state.cert)              sp.set("cert", state.cert);
  if (state.q)                 sp.set("q", state.q);
  if (state.qf && state.q)     sp.set("qf", "1");
  if (state.view === "list")   sp.set("view", "list");
  if (state.sort)              sp.set("sort", state.sort);
  if (state.z)                 sp.set("z", state.z);
  if (state.vt && state.vt > 0) sp.set("vt", String(state.vt));
  const qs = sp.toString();
  const url = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
  window.history.replaceState(null, "", url);
}

const listeners = new Set();

let current = readParams();

function cloneList(l) { return l === null || l === undefined ? null : [...l]; }

export function getState() {
  return {
    ...current,
    vendors: cloneList(current.vendors),
    domains: cloneList(current.domains),
    tiers:   cloneList(current.tiers),
    exp:     cloneList(current.exp),
    cost:    cloneList(current.cost),
  };
}

function normList(v) {
  if (v === null || v === undefined) return null;
  const arr = Array.from(new Set(Array.isArray(v) ? v : [v])).filter(Boolean);
  return arr.length ? arr : null;
}

export function setState(patch, opts = {}) {
  const next = { ...current, ...patch };
  for (const field of Object.values(LIST_KEYS)) {
    if (field in patch) next[field] = normList(patch[field]);
  }
  current = next;
  writeParams(current);
  if (!opts.silent) {
    for (const l of listeners) l(current);
  }
}

/** Reset every *filter* param (keeps theme / lang / cert / view / zoom). */
export function clearFilters() {
  setState({ vendors: null, domains: null, tiers: null, xja: false, exp: null, cost: null, qf: false, vt: null });
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

window.addEventListener("popstate", () => {
  current = readParams();
  for (const l of listeners) l(current);
});
