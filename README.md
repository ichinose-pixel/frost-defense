# Frost Defense — v17

スマホ向けライトサバイバル防衛ゲーム。移動先を選ぶだけで採集・攻撃・補給を自動実行。防衛設備の建築・強化は、そばで約0.8秒立ち止まると1件ずつ実行。各ステージのDay7ボス撃破で次へ進む、全3ステージのキャンペーンです。

公開URL: https://ichinose-pixel.github.io/frost-defense/

## 開発

Node.js 22以上を使用します。

```sh
npm ci
npm run check
python -m http.server 8080
```

`src/` を修正し、`npm run build` で `dist/game.js` を更新してください。`dist/` はGitHub Pages向けにコミットします。追加パッチで関数を上書きしないでください。Three.js r160は `vendor/` に固定し、外部CDNに依存しません。

## 構成と依存関係

| 場所                                    | 担当                                         |
| --------------------------------------- | -------------------------------------------- |
| index.html / styles/game.css            | 画面骨格、固定HUD、レイヤー                  |
| src/state.js                            | 共通状態、既存バランス定数                   |
| src/world.js / voxel-style.js           | シーン、地形、描画更新、リソース破棄         |
| src/player.js / input.js                | プレイヤー、自動攻撃、衝突、移動入力         |
| src/enemies.js                          | 敵、移動・攻撃、飛翔体                       |
| src/buildings.js / construction.js      | 設備、強化、攻撃、段階建築と再建             |
| src/resources.js / outposts.js          | 採集、住民、外部拠点                         |
| src/base.js                             | 中央拠点、LvUP、燃料                         |
| src/ui.js / ground-ui.js                | HUD、通知、地面リングとラベル                |
| src/audio.js / effects.js / feedback.js | SE、資源吸引、撃破演出                       |
| src/game.js / bootstrap.js              | 昼夜進行、リトライ、起動、単一ループ         |
| scripts/build.mjs                       | 明示した順序で単一の非公開スコープへ結合     |
| tests/game.test.mjs                     | バランス、建築・再建、リセット等の回帰テスト |

`game.update` が各システムを既存の順序で呼び出します。各システムは共通状態を参照します。建築完了とプレイヤー移動は同じ衝突判定を使用し、敵の死亡時は直接effectsへ通知します。描画はsimulation後に一度だけ行います。

依存を全面的にES modulesへ変更する工程は後続です。今回は挙動維持を優先して、グローバル公開・重複定義・実行時パッチを廃止しました。

`src/stages.js` はステージ設定、クリア記録、選択画面、クリア演出を担当します。

## 検証・運用

- `docs/v17-display.md`: 表示枠の実寸同期・雪/霧/猛吹雪の停止。
- `docs/v16-dragon.md`: 飛行ドラゴン、専用HP、方向表示、ブレスと検証。
- `docs/v15-stages.md`: 3ステージ進行・保存・クリア演出と難易度差。
- `docs/v14-reference-and-changes.md`: モデルのコード分析、UI・演出・グラフィック、負荷予算。
- `docs/v13-changes.md`: 地面UI、建築選択、設備サイズ、序盤調整。
- `docs/v12-audit.md`: 現行コード監査、変更点、残る課題。
- `docs/iphone-test.md`: 実機確認手順。
- `npm run check` が通った変更をGitHubに反映し、既存PagesのURLで確認します。
- GPUのないCIでのテストはiPhone Safariの実機確認を代替しません。
- 解放済みステージと直近クリア戦績は同じブラウザに保存。途中のDay・資材・設備は保存せず、再開時は選んだステージのDay1から開始します。
