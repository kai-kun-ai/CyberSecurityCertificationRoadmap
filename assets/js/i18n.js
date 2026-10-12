/**
 * Tiny key→{en,ja} table for UI labels that aren't already in the cert data.
 * Cert names / domain names / tier names come from the JSON itself; this
 * covers the chrome around them.
 */
const STRINGS = {
  // detail panel section headings
  vendor:               { en: "Vendor",                       ja: "ベンダ" },
  domain:               { en: "Domain",                       ja: "ドメイン" },
  logistics:            { en: "Logistics",                    ja: "受験情報" },
  prerequisites:        { en: "Prerequisites",                ja: "前提" },
  plus_factors:         { en: "Plus factors",                 ja: "加点要素" },
  minus_factors:        { en: "Minus factors",                ja: "減点要素" },
  third_party_evals:    { en: "Third-party evaluations",      ja: "第三者評価" },
  sources:              { en: "Sources",                      ja: "ソース" },
  persona_eval:         { en: "3-persona evaluation",         ja: "3ペルソナ評価" },

  // zone headers (new layout)
  zone_quick:           { en: "At a glance",                  ja: "概要" },
  zone_relations:       { en: "Roadmap context",              ja: "ロードマップ上の関連資格" },
  zone_ai:              { en: "AI evaluation — why this tier?", ja: "AI による評価 — なぜこのティアか" },
  zone_evidence:        { en: "Supporting evidence (curated facts the AI used)", ja: "根拠データ (AI が参照したキュレーション情報)" },
  required_prereqs:     { en: "Required prerequisites",       ja: "必須の前提資格" },
  recommended_prereqs:  { en: "Recommended prior certs",      ja: "事前に取得することが多い資格" },
  commonly_followed_by: { en: "Commonly followed by",         ja: "次に取得されやすい資格" },

  // recommended_certs source provenance badges + tooltips
  src_official_recommended:         { en: "OFFICIAL",  ja: "公式" },
  src_official_recommended_tooltip: { en: "Vendor / authority explicitly recommends this prior cert.", ja: "ベンダ・権威機関が公式に事前取得を推奨している。" },
  src_vendor_ladder:                { en: "LADDER",    ja: "段階" },
  src_vendor_ladder_tooltip:        { en: "Implied by the same-vendor tier ladder.",                    ja: "同一ベンダのティアラダーに沿った推測。" },
  src_community:                    { en: "COMMUNITY", ja: "通説" },
  src_community_tooltip:            { en: "Community / industry-reputation pattern, not vendor-documented.", ja: "コミュニティ / 業界通説によるもの。ベンダ非公式。" },
  src_evidence:                     { en: "Evidence link", ja: "根拠リンク" },

  // logistics keys
  cost_usd:        { en: "Cost USD",       ja: "費用 (USD)" },
  cost_local:      { en: "Cost local",     ja: "費用 (現地通貨)" },
  format:          { en: "Format",         ja: "形式" },
  duration:        { en: "Duration",       ja: "所要時間" },
  questions:       { en: "Questions",      ja: "問題数" },
  languages:       { en: "Languages",      ja: "言語" },
  renewal:         { en: "Renewal",        ja: "更新" },
  experience_yrs:  { en: "yrs experience", ja: "年の実務経験" },

  // chrome
  open_official:        { en: "Open official ↗",                       ja: "公式ページを開く ↗" },
  close:                { en: "Close (ESC)",                           ja: "閉じる (ESC)" },
  hide_details:         { en: "Hide details",                          ja: "詳細を非表示" },
  hide_details_tooltip: { en: "Collapse the detail panel; arrows stay. ESC to deselect.", ja: "詳細パネルを閉じます。矢印は残ります。ESC で選択解除。" },
  show_details:         { en: "Show details",                          ja: "詳細を表示" },
  tools:                { en: "Tools",                                 ja: "ツール" },
  tools_tooltip:        { en: "Open tools",                            ja: "ツールを開く" },
  show_overview:        { en: "Overview",                              ja: "俯瞰図" },
  show_overview_tooltip:{ en: "Jump back to the roadmap overview.",     ja: "ロードマップ俯瞰図へ戻ります。" },
  overview_aria:        { en: "Roadmap overview",                      ja: "ロードマップ俯瞰図" },
  overview_title:       { en: "Overview",                              ja: "俯瞰図" },
  overview_note:        { en: "Tap a cell to jump",                    ja: "セルをタップして移動" },
  overview_tier_axis:   { en: "Tier",                                  ja: "段階" },
  computed_at:          { en: "Computed at",                           ja: "評価日時" },
  not_in_roadmap:       { en: "(not in roadmap)",                      ja: "(未収録)" },
  none_dash:            { en: "—",                                     ja: "—" },

  // suffixes
  unit_yrs:    { en: " yrs", ja: " 年" },
  unit_minutes:{ en: " min", ja: " 分" },
  unit_usd:    { en: " USD", ja: " USD" },

  // export buttons
  export_png:        { en: "Export matrix as PNG",        ja: "ロードマップをPNGで保存" },
  png_btn_label:     { en: "📷 PNG export",               ja: "📷 PNGで保存" },
  preparing:         { en: "Preparing…",                  ja: "準備中…" },

  // context menu
  ctx_deselect:      { en: "Deselect",            ja: "選択を解除" },
  ctx_copy_abbr:     { en: "Copy abbr",           ja: "略称をコピー" },
  ctx_show_details:  { en: "Show details",        ja: "詳細を表示" },
  ctx_open_official: { en: "Open official page ↗", ja: "公式ページを開く ↗" },

  // legend
  legend_prereq: { en: "→ Prereq (▬ required ┊ ━ recommended ┄ community)",  ja: "→ 前提 (▬ 必須 ┊ ━ 推奨 ┄ 通説)" },
  legend_next:   { en: "⇢ Commonly followed by",                              ja: "⇢ 次に取得されやすい資格" },
  legend_depth:  { en: "(up to 3 hops, max 20 edges; fainter = farther)",     ja: "(最大3ホップ・最大20本、薄いほど遠い)" },
  legend_hint:   { en: "Click a cert to see its path. ESC to deselect. The URL is bookmarkable.", ja: "資格をクリックすると前後関係を表示。ESC で選択解除。URL はブックマーク可能。" },

  // vendor-highlight threshold
  vt_label:   { en: "Vendor highlight ≥",                                              ja: "ベンダ強調: 資格数" },
  vt_suffix:  { en: "certs",                                                           ja: "件以上" },
  vt_tooltip: { en: "Tint cards whose vendor publishes at least this many certs (blank / 0 disables).", ja: "この件数以上の資格を提供しているベンダの背景を強調表示します (空欄または 0 で無効)。" },


  // ---- search palette ----
  search_placeholder:   { en: "Search abbr / name / vendor / domain…",   ja: "略称 / 名称 / ベンダ / ドメインで検索…" },
  search_aria:          { en: "Search certifications",                   ja: "資格を検索" },
  search_no_results:    { en: "No matching certifications",             ja: "該当する資格がありません" },
  search_matches:       { en: "matches",                                 ja: "件ヒット" },
  search_more:          { en: "more — refine your query to see them",   ja: "件は非表示 — 絞り込むと表示されます" },
  search_filter_toggle: { en: "Hide non-matches",                       ja: "一致しない資格を隠す" },
  search_filter_tooltip:{ en: "Remove non-matching certs from the view instead of only dimming them.", ja: "一致しない資格を薄くするのではなく、表示から外します。" },
  sr_hidden_by_filter:  { en: "hidden by filters",                     ja: "フィルタで非表示" },
  search_keys_hint:     { en: "↑↓ move · Enter select · Esc close",     ja: "↑↓ 移動 · Enter 選択 · Esc 閉じる" },

  // ---- filters / facets ----
  filters:              { en: "Filters",                                 ja: "フィルタ" },
  filters_tooltip:      { en: "Filter by domain, tier, vendor, exam language, cost… (F)", ja: "ドメイン・段階・ベンダ・試験言語・費用などで絞り込み (F)" },
  clear_filters:        { en: "Clear all",                               ja: "すべて解除" },
  active_filters_aria:  { en: "Active filters",                          ja: "適用中のフィルタ" },
  facet_domain:         { en: "Domain",                                  ja: "ドメイン" },
  facet_tier:           { en: "Tier",                                    ja: "段階" },
  facet_vendor:         { en: "Vendor",                                  ja: "ベンダ" },
  facet_lang:           { en: "Exam language",                           ja: "試験言語" },
  facet_exam_ja:        { en: "Offered in Japanese",                     ja: "日本語で受験可" },
  facet_jp_only:        { en: "Include Japan-only certs",                ja: "日本限定資格を含める" },
  facet_exp:            { en: "Required experience",                     ja: "必要な実務経験" },
  facet_cost:           { en: "Exam cost (USD)",                         ja: "受験費用 (USD)" },
  facet_domain_hint:    { en: "Primary domain of the cert (matrix column).", ja: "資格の主ドメイン (マトリクスの列)。" },
  vendor_search:        { en: "Find a vendor…",                          ja: "ベンダを検索…" },
  select_all:           { en: "All",                                     ja: "すべて" },
  select_none:          { en: "Clear",                                   ja: "解除" },
  sidebar_title:        { en: "Overview & filters",                      ja: "俯瞰 & フィルタ" },
  sidebar_close:        { en: "Close sidebar",                           ja: "サイドバーを閉じる" },
  overview_hint_desktop:{ en: "Counts follow the current filters / search. Click a cell to jump.", ja: "数字は現在のフィルタ / 検索を反映。クリックで移動。" },
  domain_focus_tooltip: { en: "Click to show only this domain",          ja: "クリックでこのドメインのみ表示" },
  domain_unfocus_tooltip:{ en: "Click to show all domains",              ja: "クリックで全ドメインを表示" },

  // ---- views / zoom / legend ----
  view_matrix:          { en: "Matrix",                                  ja: "マトリクス" },
  view_list:            { en: "List",                                    ja: "一覧" },
  view_matrix_tooltip:  { en: "Tier × domain matrix (the roadmap)",      ja: "段階 × ドメインのマトリクス (ロードマップ)" },
  view_list_tooltip:    { en: "Sortable table of every visible cert",    ja: "表示中の資格を並べ替え可能な表で見る" },
  zoom_label:           { en: "Card size",                               ja: "カード" },
  zoom_in:              { en: "Larger cards (show vendor + name)",       ja: "カードを大きく (ベンダ・名称を表示)" },
  zoom_out:             { en: "Smaller cards (fit more on screen)",      ja: "カードを小さく (一画面に多く表示)" },
  legend:               { en: "Legend",                                  ja: "凡例" },
  legend_title:         { en: "How to read this roadmap",                ja: "ロードマップの見方" },
  legend_axes:          { en: "Rows = tier (top = most advanced, bottom = entry). Columns = primary domain.", ja: "行 = 段階 (上ほど上級、下ほど入門)。列 = 主ドメイン。" },
  legend_jp_dot:        { en: "Red dot = Japan-only certification",      ja: "赤い点 = 日本限定資格" },
  legend_avail:         { en: "Strikethrough = paused / retired",        ja: "取り消し線 = 受験停止中 / 提供終了" },
  legend_shortcuts:     { en: "Keyboard",                                ja: "キーボード" },
  shortcut_search:      { en: "/ or Ctrl+K — focus search",              ja: "/ または Ctrl+K — 検索にフォーカス" },
  shortcut_filters:     { en: "F — toggle filters",                      ja: "F — フィルタ開閉" },
  shortcut_esc:         { en: "Esc — clear search, then deselect",       ja: "Esc — 検索解除 → 選択解除" },
  shortcut_arrows:      { en: "↑↓ Enter — pick a search result",         ja: "↑↓ Enter — 検索結果を選択" },

  // ---- list view ----
  col_abbr:             { en: "Abbr",                                    ja: "略称" },
  col_name:             { en: "Name",                                    ja: "名称" },
  col_vendor:           { en: "Vendor",                                  ja: "ベンダ" },
  col_domain:           { en: "Domain",                                  ja: "ドメイン" },
  col_tier:             { en: "Tier",                                    ja: "段階" },
  col_cost:             { en: "Cost (USD)",                              ja: "費用 (USD)" },
  col_langs:            { en: "Exam langs",                              ja: "試験言語" },
  col_exp:              { en: "Exp. (yrs)",                              ja: "経験 (年)" },
  col_renewal:          { en: "Renewal",                                 ja: "更新" },
  list_empty:           { en: "No certifications match the current filters.", ja: "条件に一致する資格がありません。" },
  sort_tooltip:         { en: "Click to sort",                           ja: "クリックで並べ替え" },

  // ---- chrome tooltips ----
  jp_toggle_tooltip:    { en: "Show / hide Japan-only certifications (IPA, SEA/J, …)", ja: "日本限定資格 (IPA, SEA/J など) の表示 / 非表示" },
  lang_toggle_tooltip:  { en: "Switch label language (English / 日本語)", ja: "表示言語を切替 (English / 日本語)" },
  theme_tooltip:        { en: "Toggle dark / light theme",               ja: "ダーク / ライトを切替" },
  tooltip_hint:         { en: "Click: path & details · Right-click: menu", ja: "クリック: 前後関係と詳細 · 右クリック: メニュー" },
  exam_ja_badge:        { en: "JA exam",                                 ja: "日本語受験可" },
  count_certs:          { en: "certs",                                   ja: "件" },
  count_of:             { en: "of",                                      ja: "/" },
  hits:                 { en: "hits",                                    ja: "件ヒット" },

  // availability
  availability:           { en: "Availability",           ja: "受験可否" },
  avail_paused_badge:     { en: "PAUSED",                 ja: "受験停止中" },
  avail_retired_badge:    { en: "RETIRED",                ja: "提供終了" },
  avail_coming_badge:     { en: "SOON",                   ja: "提供予定" },
  avail_paused_banner:    { en: "Exam delivery is currently paused.",   ja: "現在この資格は受験停止中です。" },
  avail_retired_banner:   { en: "This certification has been retired.", ja: "この資格は提供終了しています。" },
  avail_coming_banner:    { en: "Coming soon.",                          ja: "近日提供予定です。" },
};

export function t(key, lang) {
  const row = STRINGS[key];
  if (!row) return key;
  return row[lang === "ja" ? "ja" : "en"] || row.en || key;
}
