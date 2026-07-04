# AGENTS.md — ライフプランOS

単一 `index.html` のライフプランシミュレーター。GitHub Pages で main ブランチが即公開される。

## 必須の検証（変更を終える前に）

1. `node tests/run-tests.js` — エンジンの自動テスト（計算ロジック変更時は期待値も更新）
2. `<script>` 部を抽出して `node --check`
3. ヘッドレスChromeで `--dump-dom` し、`sim-sum` の存在と `<tr>` が100行超であることを確認（実行時エラー検知）

CI（.github/workflows/ci.yml）が同じ3点をpush/PRごとに検査する。

## 重要な規約

- 内部計算はすべて「円」。入力欄の読み取りは必ず `g(id)`（カンマ除去つき）
- `calculate(p)` は純関数を保つ（DOM参照禁止）— テスト可能性の要
- 家族は生年0=「いない」。呼び方ラベルは `.lbl-sp/.lbl-c1/.lbl-c2` で反映
- 詳細なアーキテクチャとモデル前提は `CLAUDE.md` を参照（内容は共通）

## AI協働ルール（複数AIで作業するとき）

- 詳細はワークスペース（ai-development-workspace）の `docs/COLLABORATION_JA.md`。要点:
  実装は featureブランチ→PR ／ レビュー依頼を受けたら差分+周辺コードを読み、指摘は `gh pr comment` でPRに記録し、結論（承認相当/修正必要）を明記 ／ 並行作業では担当Issueと触るファイルを宣言し、mainへ直接pushしない ／ 審判はCIとテスト、マージは人間
