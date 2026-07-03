---
description: lifeplanの検証一式（テスト・構文・描画）を実行して結果を報告
---

以下の検証を順に実行し、結果をまとめて報告してください。失敗があれば原因を特定して修正案を提示してください。

1. エンジンテスト: `node tests/run-tests.js`
2. JS構文チェック: index.html の `<script>` 部を /tmp/app.js に抽出して `node --check /tmp/app.js`
3. 描画スモークテスト: ヘッドレスChrome（`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`）で `--headless --disable-gpu --virtual-time-budget=8000 --dump-dom "file://$PWD/index.html"` を実行し、以下を確認:
   - `sim-sum`（サマリーバー）が存在する
   - `理想額/月`（理想バランス表）が存在する
   - `<tr` の出現回数が100を超える（CF表・ライフイベント表が生成された証拠）

すべて通ったら「✅ 検証3点すべてパス」と報告。デプロイ後の確認を求められたら、本番URL https://subara1.github.io/lifeplan/ に対しても同じ描画テストを実行してください。
