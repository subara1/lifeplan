# CLAUDE.md — ライフプランOS

家計・資産のライフプランシミュレーター。単一の `index.html`（HTML+CSS+JS）で構成され、GitHub Pages（mainブランチ）で https://subara1.github.io/lifeplan/ に自動公開される。**mainへのpush = 即本番反映**。

## 変更を終える前に必ず実行すること

```bash
node tests/run-tests.js     # エンジンの自動テスト（41件）
```

さらに描画のスモークテスト（構文チェックだけでは実行時エラーを検知できない。過去に未定義変数参照のまま本番デプロイされた事故あり）:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --virtual-time-budget=8000 --dump-dom "file://$PWD/index.html" > /tmp/r.html
grep -c "<tr" /tmp/r.html   # 100超であること（表が生成された証拠）
grep -q "sim-sum" /tmp/r.html && echo OK
```

CI（.github/workflows/ci.yml）も同じ3点（テスト・構文・描画）を検査する。**計算ロジックを変更したらテストの期待値も更新すること**。

## アーキテクチャ

- 全コードは `index.html` 内: CSS → HTML → `<script>`（STATE / PERSISTENCE / ROUTER / UTILITIES / PARAMETER COLLECTION / CALCULATION ENGINE / RENDER / CHARTS / EXPORT / INIT のコメント区切り）
- **単位の規約: 内部計算はすべて「円」**。入力は欄により円 or 万円（`getP()` で `*10000` 変換）。表示は `w(v)`=万円丸め、`mw(v)`=万円小数1桁
- データフロー: 入力欄 → `getP()` → `calculate(p)`（純関数・rows配列を返す）→ `getMetrics()` → `drawSimResults()` 各種描画
- rowsの1行 = 1年分: `{yr,ua,wa,c1a,c2a,totalInc,uInc,wInc,pen,sev,reemploy,custInc,varExp,fixExp,housing,childcare,edu,otherExp,totalExp,balance,cash,invest,totalAsset,investReturn,contribution,withdrawal}`
- 永続化: `state`（goals/scenarios/inputs等）を localStorage に保存。入力欄の値は `saveInputs()/restoreInputs()`
- 家族構成: 生年が0/空 =「いない」（`hasSp/hasC1/hasC2`）。呼び方は `spLabel/c1Label/c2Label`（`.lbl-sp/.lbl-c1/.lbl-c2` クラスで表示反映）
- 円建て入力欄は `initUnits()` で type=text + カンマ表示に変換される。**数値の読み取りは必ず `g(id)` を使う**（カンマを除去してparseする）
- マネーフォワードCSV取り込み: `parseMFCSV()`/`mfAggregateToFields()` は純関数（テスト対象）。大項目→入力欄の対応は `MF_CAT_MAP`。文字コードはUTF-8→Shift_JISの順で自動判定。MFに個人向け公開APIはないためCSV経由のみ

## 計算モデルの前提（変更時は要注意）

- 資産エンジン: 投資は運用継続 → 収支を現金に反映 → 現役中は積立（現金→投資）→ 現金不足なら投資を取り崩し。現金がマイナスになるのは投資も枯渇したときのみ
- 年金: 基礎（納付年数/40×81.6万）+ 厚生（平均年収×0.5481%×加入年数）を本人・配偶者別に推計。直接入力優先。繰上げ−0.4%/月・繰下げ+0.7%/月。毎年 `pn_slide`%で物価スライド
- インフレ: 生活費・固定費・教育費・保育費・旅行・医療に適用。住宅価格・退職金・カスタムイベントは名目固定
- 住居手当は賃貸中のみ。購入後は固定資産税（h_tax）が毎年かかる
- 簡易化している点: 税・社会保険料は手取り入力で吸収 / 加給年金・遺族年金なし / 3-5歳の教育費は無償化前提で2.2万/年

## 作業の進め方

- 変更は小さく。計算とUIの変更は別コミットが望ましい
- push前に上記の検証3点。pushしたら `gh api repos/subara1/lifeplan/pages -q .status` で built を確認し、本番URLでも描画確認
- `/check` カスタムコマンド（.claude/commands/check.md）で検証一式を実行できる
