# 共通コードからiOS／Androidを作る

ブラウザ版v17のゲームロジックと表示をそのまま使う、Capacitor 8.5.1の初期アプリ構成。
GitHub PagesのURL・ゲーム内容は変更していません。

## 構成

- `src/` → `npm run build` → `dist/game.js`：全プラットフォーム共通。
- `npm run mobile:build`：同じindex.html、CSS、Three.js、ゲームbundleを`www/`へコピー。
- `npm run mobile:sync`：上記をビルドし、`android/`と`ios/`へ同期。
- `android/`：Android Studioの正式プロジェクト。
- `ios/App/`：Xcode + Swift Package Managerの正式プロジェクト。
- `www/`・各OSへコピーされたWeb資産は生成物。編集・コミットしない。
- 公開サイトをロードする`server.url`は設定しない。ネット接続なしでゲーム資産をロードできる。

アプリIDは開発用に`io.github.ichinosepixel.frostdefense`を採用。ストア登録前に正式IDを確定する。
アイコンと起動画面はCapacitorの仮素材。ストア提出前に専用素材へ差し替える。
ゲーム表示のバージョンはv17のまま。ストア用versionCode/build番号は別管理（現在1）。

## 開発

Node.js 22以上。最初に`npm ci`。

Android：Android Studio 2025.2.1以降、SDK 36、JDK 21を用意して`npm run mobile:android`。
開いたAndroid Studioで端末を選びRun。コマンドでは`npm run mobile:build`、
`npx cap sync android`、`cd android`、`./gradlew assembleDebug`（Windowsは`gradlew.bat assembleDebug`）。
APKは`android/app/build/outputs/apk/debug/app-debug.apk`。

iOS：Mac、Xcode 26以降で`npm run mobile:ios`。
XcodeでSigningのTeamを設定し、接続したiPhoneを選びRun。
この初期構成はSwift Package Managerを使うためCocoaPodsは不要。
TestFlight配布はApple Developer登録・配布用署名・App Store Connect設定が別途必要。

ゲームを修正したら必ず再度syncしてから各IDEでビルドする。
GitHub Pages更新だけでは、インストール済みアプリ内のゲームは更新されない。

## GitHubでAndroidテスト版を取得

Actionsの「Android test app」がmainの関連変更時／手動実行時にテストとAPKビルドを行う。
成功した実行のArtifactsから`frost-defense-android-debug`をダウンロード・解凍する。
これはテスト用debug APK。ストア提出用AAB・配布用署名は含まない。
CIの一時debug署名は実行ごとに変わる場合があり、別ビルドへの更新時に再インストールが必要になることがある。
再インストールではセーブが消えるため、継続テストにはローカルの固定debug署名を使う。

## 今回の検証範囲と実機確認

`npm run check`は既存ゲームテストに加え、同梱ファイルがブラウザ版と一致し、
外部URLを入口にせず必要資産が揃っていることを検証する。
両OSのCapacitorプロジェクト生成・syncを確認する。これだけでは実機動作確認にはならない。
iOSコンパイル／署名／実機GPUの動作はMac・端末で確認が必要。

- 初回起動と機内モードでの起動
- HUD、画面下端・切り欠き、画面回転、水色表示の非再発
- アプリ切替／画面ロック後の復帰、音声、移動入力の解除
- 10分以上のプレイ、ドラゴン戦時の処理落ち・発熱
- ステージクリア後の終了・再起動、進行保存

既存のvisibilitychangeで停止・入力解除・音声休止を行うが、ネイティブ実機での復帰挙動は要確認。
保存は現状の端末内localStorage。ブラウザ版とアプリ版は別保存で、自動移行・クラウド同期はしない。
途中セーブはまだなく、強制終了時は進行中のステージを再開できない。
広告・課金・通知は未導入。

公式資料：https://capacitorjs.com/docs/getting-started/environment-setup
