# 夜空のコンパニオン

キャラクターをアップロードしてアシスタントしてもらえる、ひとり用のコンパニオンアプリです🌙✨
天気・カレンダー・日記/メモ・ポモドーロタイマー・AIとのおしゃべり機能があります。

このリポジトリには2つの形があります。

| | 場所 | 説明 |
| --- | --- | --- |
| 🌐 Web版（オリジナル） | [`index.html`](./index.html) | ブラウザだけで動くシングルファイル版。[pppzet.github.io/YozoraCompanion](https://pppzet.github.io/YozoraCompanion/) |
| 📱 Android版（このブランチ） | `src/` ほか | Expo（React Native + TypeScript）への移植版。APKをスマホに入れて使えます |

---

# 📱 Android版

Web版の全機能をTypeScript + Expoで移植し、スマホ向けに再構成したものです。

## 機能

- **キャラクター** — タップで表情とセリフが変わる。画像アップロードで好きなキャラに差し替え、複数キャラの切り替え、セリフ・表情の連動編集
- **初期キャラ「ルナ」** — Skiaで描画。呼吸とまばたきのアニメーション付き
- **星霜の塔** — 背景で実時間を刻み続けるからくり時計（分針リング・時針盤・秒針が回転）。星のまたたき、オーロラのゆらぎ、たまに流れ星
- **タイマー** — ポモドーロ（作業/休憩、5分刻み設定）とストップウォッチ。バックグラウンドでも時刻基準で正確に進み、フェーズ終了は通知・チャイム・バイブでお知らせ
- **天気** — [Open-Meteo](https://open-meteo.com/)（キー不要）。現在地または都市名検索、3日分の予報、天気に合わせたセリフ
- **カレンダー** — 月表示で予定をメモ
- **日記・メモ** — 写真添付、編集履歴表示、ライトボックス表示
- **AIチャット** — キャラの性格設定を反映したおしゃべり
  - **Gemini API**（[Google AI Studio](https://aistudio.google.com/apikey)で無料発行、モデル名も変更可）
  - **OpenAI互換API** — OpenAI / OpenRouter / LM Studio / Ollama など、ベースURL・モデル・キーを自由に設定
- **背景カスタマイズ** — 好きな画像を背景に。星や時計のオーバーレイ表示も選べる
- **バックアップ** — JSON書き出し/読み込み。**Web版のバックアップJSONもそのまま読み込めます**（逆方向も可）
- APIキーは端末の安全な領域（Android Keystore）にだけ保存され、バックアップには含まれません

## APKの入手

[Releases](../../releases) から最新の `YozoraCompanion-x.y.z.apk` をダウンロードして、Android端末でインストールしてください（「提供元不明のアプリ」の許可が必要な場合があります）。

## 開発

```bash
npm install
npm start            # Metro起動（開発ビルドで開く）
npm run android      # Androidで起動
```

検証コマンド:

```bash
npm run typecheck    # tsc --noEmit（strict + 追加フラグ全部入り）
npm run lint         # oxlint（エージェント向けフォーマット）
npm run lint:strict  # 警告もエラー扱い（CIと同じ）
npm run format       # prettier --write
npm run format:check
```

アイコン・チャイム音の再生成:

```bash
npm run assets:generate
```

## APKのリリース（GitHub Actions）

1. GitHubの **Actions** タブ → **Android APK Release** を選ぶ
2. **Run workflow** を押す（バージョン名は空ならpackage.jsonの値を使用）
3. ビルドが終わると、`v<バージョン>` のGitHub ReleaseにAPKが添付されます

CI（`CI` ワークフロー）はpush/PRごとにlint・format・typecheck・Metroバンドルを検証します。

### リリース署名（推奨・任意）

Secrets未設定でもAPKはビルドされますが、React Native標準のdebugキーで署名されます。継続して配布するなら、自分のキーストアをSecretsに登録してください（署名が変わるとアップデート時に再インストールが必要になるため、キーストアは大切に保管を）。

```bash
# キーストアを作る
keytool -genkeypair -v -keystore release.keystore -alias yozora \
  -keyalg RSA -keysize 2048 -validity 10000

# base64にしてクリップボードへ（例）
base64 -w0 release.keystore
```

リポジトリの **Settings → Secrets and variables → Actions** に登録:

| Secret | 内容 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | keystoreファイルのbase64 |
| `ANDROID_KEYSTORE_PASSWORD` | ストアのパスワード |
| `ANDROID_KEY_ALIAS` | キーのエイリアス（例: `yozora`） |
| `ANDROID_KEY_PASSWORD` | キーのパスワード |

## 技術スタック

- **Expo SDK 54**（React Native 0.81 / React 19、New Architecture）+ **expo-router**
- **TypeScript**（`strict` + `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes` などの追加フラグ全部入り）
- **@shopify/react-native-skia** — 夜空・オーロラ・星霜の塔・ルナのGPU描画
- **react-native-reanimated 4** — UIスレッドアニメーション
- **expo-sqlite** — キャラ・セリフ・日記・予定・チャット履歴の保存（画像はファイル保存）
- **expo-secure-store** — APIキーの保管
- **Oxlint / Prettier** — エージェントフレンドリー設定（`.oxlintrc.json` / `.prettierrc.json`）
- フォント: [しっぽり明朝](https://fonts.google.com/specimen/Shippori+Mincho)

```
src/
  app/            # expo-router（タブ5画面）
  components/     # UI部品・Skia描画（sky/ character/ home/ ui/）
  lib/            # DB・AIクライアント・天気・バックアップなどのロジック
  state/          # zustandストア（キャラ・タイマー・天気・UI）
scripts/          # アイコン/チャイム生成・CI用署名設定
.github/workflows # CI と APKリリース
```

## データの保存について

- 登録したキャラクターや日記・メモ、チャット履歴は、**すべて端末内だけ**に保存されます（外部サーバーには送られません）
- チャット送信時のみ、その内容が設定したAIプロバイダ（GoogleやOpenAI互換サーバー）へ端末から直接送信されます
- 大事な記録は「設定」タブの「バックアップ」からJSONに書き出しておくのがおすすめです

---

# 🌐 Web版（オリジナル）

ブラウザだけで動作するWebアプリです。インストールは不要です。

## 🚀 使いかた

1. 下記のURLにアクセスする
   👉 **（https://pppzet.github.io/YozoraCompanion/）**
2. 案内にそってキャラクターの画像を登録する

- 推奨ブラウザ：**Chrome / Edge / Brave など Chromium系ブラウザ**（スマホ・PCどちらもOK）
- Safariでもおおむね動作しますが、**プライベートブラウズ（シークレットモード）では保存がうまくいかない場合があります**。通常モードで開いてください
- インターネット接続がなくても、AIチャットと天気機能以外は使えます
- オフラインでも使いたい場合は、開いたページをブラウザの「名前をつけて保存」でHTMLファイルとして端末に保存しておくと、ネット接続なしでも起動できます（保存したファイルをダブルクリックして開く形になります）

## 💾 データの保存について（大事）

- 登録したキャラクターや日記・メモ、チャット履歴は、**すべてこの端末のブラウザ内だけ**に保存されます（外部のサーバーには送られません）
- そのため、以下のときはデータが消えます
  - ブラウザのキャッシュ／サイトデータを削除したとき
  - シークレットモードで使っていたとき（閉じると消えます）
  - 別の端末・別のブラウザで開いたとき（保存内容は引き継がれません）
- **大事な記録は「設定」タブの「バックアップ」から、ときどきJSONファイルに書き出しておくことを強くおすすめします**
  - 書き出したJSONは「バックアップ」の読み込み欄から選ぶと復元できます（今のデータは上書きされるので注意）
  - このJSONにAPIキーは含まれないので、書き出したファイルを人に渡しても鍵が漏れる心配はありません

## 🤖 AIチャット機能について（任意機能）

チャット機能を使うには、Googleの **Gemini API キー**を自分で取得して、「設定」タブに登録する必要があります。使わなくても他の機能は問題なく使えます。

- キーの取得先：[Google AI Studio](https://aistudio.google.com/apikey)（Googleアカウントがあれば無料で発行できます。無料枠あり）
- キーは**あなたの端末のブラウザ内だけ**に保存されます。開発者を含め、誰にも送信されません
- チャットを送信すると、**その内容は直接あなたの端末からGoogleのサーバーへ送信されます**（Gemini APIの仕組み上、これは避けられません）。日記やメモなど他の機能の内容は送信されません
- 無料枠には利用回数の上限があります。エラーが出た場合はAI Studio側でキーの状態や利用状況を確認してみてください

## ☁️ 天気機能について

- [Open-Meteo](https://open-meteo.com/)という登録不要の無料サービスを利用しています
- 現在地から自動取得する場合、ブラウザから位置情報の利用許可を求められます。許可したくない場合は、都市名を入力して手動で検索することもできます

## 🆘 困ったときは

- 画面がおかしい・固まった → ページを再読み込みしてください
- 「保存容量がいっぱいみたい」という通知が出た → 使っていない日記や画像、キャラクターを整理してください
- それでも直らない → 一度ブラウザのサイトデータを削除してから開き直してください（**先にバックアップを取ってから**）

## ⚠️ 免責事項

- 個人が趣味で作っている無料のツールです。動作の保証はできませんので、自己責任でお使いください
- 予告なく機能が変更・終了する場合があります
- 大切な記録は必ずこまめにバックアップを取ってください

## 📜 ライセンス

このリポジトリのコードは **MITライセンス** で公開しています。改変・再配布・商用利用も自由に行えます(詳しくは `LICENSE` ファイルをご覧ください)。
なお、アプリ内でユーザーが自分でアップロードするキャラクター画像などの著作権には影響しません。

## 💌 感想・不具合報告

不具合や「こうだったらいいな」があれば、気軽に教えてください🌸
