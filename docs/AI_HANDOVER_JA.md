# AI_HANDOVER_JA.md — 後継AIへ（ライフプランOS）

公開アプリ（GitHub Pages・main push=即本番）。CLAUDE.mdの検証3点＋描画スモーク必須。

## 不変条件
- 内部計算は円・g(id)でカンマ除去・純関数エンジン+テスト（期待値も更新）
- デザインシステム準拠（絵文字なし・.mcはドット式・rdotで信号表現）
- 生活改善アプリへ自動同期（buildLifeHubPayload: lifeEvents+labels同梱を壊さない）
- iOSガード(16px/touch-action)導入済み・チャットチップは折り返し

## 学び
- grab()型テストは関数名変更に弱い（BADGES→BADGE_DEFS事故）。挿入後はgrepで実在確認
