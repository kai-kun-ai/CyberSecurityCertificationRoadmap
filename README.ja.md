# サイバーセキュリティ資格ロードマップ

> 第三者AIが評価する、独自に編纂したセキュリティ資格ロードマップ。
> GitHub Pages で公開する静的サイト。資格の事実情報は JSON に保持し、
> 階層 (tier) は AI ペルソナが事実情報から算出します。

[**ロードマップを開く →** https://hinoshiba.github.io/CyberSecurityCertificationRoadmap/](https://hinoshiba.github.io/CyberSecurityCertificationRoadmap/)

English version: [README.md](./README.md)

---

## インスピレーションと謝辞

本プロジェクトは以下の公開された素晴らしい先行プロジェクトをリスペクトし、
インスピレーションを受けています。

- [Paul Jerimy's Security Certification Roadmap](https://pauljerimy.com/security-certification-roadmap/)
- [CyberDudeKZ's Security Cert Roadmap](https://cyberdudekz.github.io/security-cert-roadmap/)

本リポジトリにおける**資格一覧、ドメイン分類、階層ルーブリック、スキーマ、
UI はすべて独自に作成しています。両プロジェクトのデータ、レイアウト、コード、
画像のいずれも複製していません**。詳細は [NOTICE](./NOTICE) を参照してください。

日本資格 (IPA, SEA/J 等) については、IPA・経済産業省 (METI)・JPCERT/CC・
NISC など日本の公的機関の情報を一次ソースとします。

---

## プロジェクトの根幹: 第三者評価者としての AI

これが本プロジェクトの最重要ルールであり、ワークフローが他のリポジトリと
異なる理由です。

> **PR は (a) `data/certs/` 以下の資格 JSON と、(b) `.claude/skills/` 以下の
> 評価スキル のみを変更対象とします。**
>
> 本プロジェクトは AI を独立した第三者評価者として全幅の信頼を置きます。
> 資格の**事実情報** (ベンダ、公式 URL、試験ロジスティクス、加点要素・減点
> 要素、第三者評価、ソースリンク) は人間が JSON に記載しますが、資格の
> **階層** (Foundational / Associate / Professional / Expert / Specialty)
> はそれらの事実情報から `evaluate-roadmap-3-personas` スキルが**算出**
> します。資格毎に手動で階層を設定することはしません。

これによって以下の二つの性質が得られます。

1. **再現可能**: 誰が評価スキルを再実行しても同じ階層になる。階層への異論
   は「事実情報が違う」「ルーブリックを直すべき」といった会話になり、
   主観の言い合いにならない。
2. **監査可能**: 加点/減点の根拠 URL がデータに永続的に残る。「なぜ Expert
   なのか?」に対して常にルーブリックと要素が答えてくれる。

加点・減点の `weight_hint` は JSON に書きますが、それを階層へ変換するの
は評価スキル側の責務です。JSON の責務ではありません。

階層に異議がある場合は、

- 加点/減点要素を変えるべき新しい根拠を Issue として提出する、または
- ルーブリック自体に問題があるなら
  `.claude/skills/evaluate-roadmap-3-personas/SKILL.md` への変更案を出す、

のいずれかでお願いします。

品質は **3 つの異なるペルソナ** (日本企業 CISO、米国 MSSP 採用マネージャ、
欧州オフェンシブコンサルタント) によって担保されます。3 ペルソナの判定が
全資格の 10% を超えて 1 階層以上ずれた場合、評価実行は失敗扱いとし、デー
タではなく**ルーブリックの見直し**を促します。

---

## コントリビュート

Issue は何でも歓迎します。**PR は data と skills のみに限定**してください。

| やりたいこと                       | Issue テンプレート                                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 資格を追加したい                   | [Add a certification](https://github.com/hinoshiba/CyberSecurityCertificationRoadmap/issues/new?template=add-certification.yml)   |
| 既存資格の情報を更新したい         | [Update a certification](https://github.com/hinoshiba/CyberSecurityCertificationRoadmap/issues/new?template=update-certification.yml) |
| 公的機関のソースを追加したい       | [Add a source agency](https://github.com/hinoshiba/CyberSecurityCertificationRoadmap/issues/new?template=add-source-agency.yml)   |
| 階層判定に異議がある               | [Report an evaluation issue](https://github.com/hinoshiba/CyberSecurityCertificationRoadmap/issues/new?template=report-evaluation-issue.yml) |

`respond-to-issue` スキルが Issue を拾って PR の下書きを作成します。

---

## ロードマップの使い方

静的サイトであり、以下はすべて URL 状態として保持されます。作った表示は
そのままブックマーク・共有できます。

- **検索** (`/` または `Ctrl+K`): 略称・名称 (EN / JA)・ベンダ・ドメイン・
  段階のラベルを関連度順に入力補完。`↑ ↓` で移動、`Enter` で開く、`Esc` で
  閉じる。「一致しない資格を隠す」で検索を絞り込みに切り替え。
- **フィルタ** (`F`): ドメイン、段階、日本語で受験可、日本限定資格、必要な
  実務経験、受験費用、ベンダ。各値に「押した後に残る件数」を表示。適用中の
  フィルタはマトリクス上部のチップから個別に外せます。
- **俯瞰図**: サイドパネルの段階 × ドメインのヒートマップは現在のフィルタ /
  検索を反映。セルをクリックするとその位置へ移動。列見出しをクリックすると
  1 ドメインに集中表示 (カードにベンダと正式名称が出ます)。
- **表示**: `マトリクス` (ロードマップ) と `一覧` (費用・言語・経験・更新
  などで並べ替え可能な表)。フィルタと詳細パネルは共通。
- **カードサイズ** `− / +`、ホバーのツールチップ、`?` の凡例 (ショートカット
  一覧つき)、表示中マトリクスの PNG 保存。

| パラメータ | 意味 | 例 |
| --- | --- | --- |
| `q`, `qf=1` | 検索語。`qf` で一致しない資格を隠す | `?q=cloud&qf=1` |
| `d`, `t` | ドメイン / 段階の id (カンマ区切り) | `?d=cloud-security,iam&t=associate` |
| `v` | ベンダ slug | `?v=isc2,giac` |
| `xja=1`, `jp=1` | 日本語で受験可 / 日本限定資格を表示 | `?xja=1&jp=1` |
| `exp`, `cost` | 経験年数帯 `0,1-2,3-5,6+`、費用帯 `lt300,300-600,600-1000,gte1000,unknown` | `?exp=0,1-2&cost=lt300` |
| `view`, `sort` | `matrix` (既定) または `list`。`sort=<列>:<asc|desc>` | `?view=list&sort=cost:desc` |
| `z` | カードサイズ `s` / `m` / `l` | `?z=l` |
| `cert` | 選択中の資格 id (前提経路を描画) | `?cert=isc2.cissp` |
| `lang`, `theme`, `vt` | 表示言語、テーマ、ベンダ強調のしきい値 | `?lang=ja&theme=light` |

この UI の背景にある調査 (ペルソナ、観察された課題、要件) は
[`docs/ux-research.md`](./docs/ux-research.md) にまとめています。

---

## ローカル実行

すべての操作は Docker 経由で行えます。コンテナは `~/.claude*` と `~/.codex`
を read-write でマウントし、Claude Code / Codex CLI がそのまま使えます。

```sh
make shell      # コンテナ内シェル (claude / codex 利用可)
make serve      # http://localhost:8080 で静的サイトを配信
make validate   # data/certs 配下の JSON をスキーマ検証
make evaluate   # 3 ペルソナ評価スキルを実行
```

詳細なマウント設定は `docker-compose.yml` を参照してください。

---

## ライセンス

**[Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.ja)** &mdash; リポジトリ全体に適用されます。すなわち、キュレーションされたデータセット (`data/**/*.json` &mdash; ベンダ・資格情報、ドメイン分類、ティア ルーブリック、ソース機関レジストリ、AI による評価とその根拠) と、周辺のコード (JS / Python / スキーマ / スキル / Docker / Actions / HTML / CSS) の両方を含みます。

商用利用を含め、共有・改変は自由に行えますが、(1) **帰属表示**を行い、(2) 派生物を**同一ライセンス** (ShareAlike) の下で公開する必要があります。ライセンス全文は [LICENSE](./LICENSE) を、選定理由・帰属表示の例・商標の取り扱いについては [NOTICE](./NOTICE) を参照してください。
