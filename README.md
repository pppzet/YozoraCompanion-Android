# 夜空のコンパニオン（Android版）

キャラクターをアップロードしてアシスタントしてもらえる、ひとり用のコンパニオンアプリです🌙✨
天気・カレンダー・日記/メモ・ポモドーロタイマー・AIとのおしゃべり機能があります。

[pppzet/YozoraCompanion](https://github.com/pppzet/YozoraCompanion)（Web版オリジナル）を、Expo（React Native + TypeScript）でAndroidアプリに移植したものです。

## 機能

- **キャラクター** — タップで表情とセリフが変わる。画像アップロードで好きなキャラに差し替え、複数キャラの切り替え、セリフ・表情の連動編集
- **初期キャラ「ルナ」** — Skiaで描画。呼吸とまばたきのアニメーション付き
- **星霜の塔** — 背景で実時間を刻み続けるからくり時計(分針リング・時針盤・秒針が回転)。星のまたたき、オーロラのゆらぎ、たまに流れ星
- **タイマー** — ポモドーロ(作業/休憩、5分刻み設定)とストップウォッチ。バックグラウンドでも時刻基準で正確に進み、フェーズ終了は通知・チャイム・バイブでお知らせ
- **天気** — [Open-Meteo](https://open-meteo.com/)(キー不要)。現在地または都市名検索、3日分の予報、天気に合わせたセリフ
- **カレンダー** — 月表示で予定をメモ
- **日記・メモ** — 写真添付、編集履歴表示、ライトボックス表示
- **AIチャット** — キャラの性格設定を反映したおしゃべり
  - **Gemini API**([Google AI Studio](https://aistudio.google.com/apikey)で無料発行。モデル名も変更可)
  - **OpenAI互換API** — OpenAI / OpenRouter / LM Studio / Ollama など、ベースURL・モデル・キーを自由に設定
- **背景カスタマイズ** — 好きな画像を背景に。星や時計のオーバーレイ表示も選べる
- **バックアップ** — JSON書き出し/読み込み。**Web版オリジナルのバックアップJSONもそのまま読み込めます**

## APKの入手

[Releases](../../releases) から最新の `YozoraCompanion-x.y.z.apk` をダウンロードして、Android端末でインストールしてください(「提供元不明のアプリ」の許可が必要な場合があります)。

## 💾 データの保存について(大事)

- 登録したキャラクターや日記・メモ、チャット履歴は、**すべて端末内だけ**に保存されます(外部のサーバーには送られません)
- APIキーは端末の安全な領域(Android Keystore)にだけ保存され、バックアップJSONには含まれません
- アプリをアンインストールするとデータは消えます。**大事な記録は「設定」タブの「バックアップ」から、ときどきJSONファイルに書き出しておくことを強くおすすめします**
  - 書き出したJSONは「バックアップ」の「JSONファイルを読み込む」から復元できます(今のデータは上書きされるので注意)

## 🤖 AIチャット機能について(任意機能)

チャット機能を使うには、「設定」タブでAPIキーを登録する必要があります。使わなくても他の機能は問題なく使えます。

- **Gemini**: [Google AI Studio](https://aistudio.google.com/apikey)でキーを無料発行できます(無料枠あり)
- **OpenAI互換**: ベースURL・モデル名・キーを自由に設定できます。LM StudioやOllamaなどキー不要のローカルサーバーもOK
- チャットを送信すると、**その内容は端末から設定先のAIサーバーへ直接送信されます**。日記やメモなど他の機能の内容は送信されません
- エラーが出た場合は、キーの状態や利用状況を各サービス側で確認してみてください

## 開発

```bash
npm install
npm start            # Metro起動
npm run android      # Androidで起動(開発ビルド)
```

検証コマンド:

```bash
npm run typecheck    # tsc --noEmit(strict + 追加フラグ全部入り)
npm run lint         # oxlint(エージェント向けフォーマット)
npm run lint:strict  # 警告もエラー扱い(CIと同じ)
npm run format       # prettier --write
npm run format:check
```

アイコン・チャイム音の再生成:

```bash
npm run assets:generate
```

## APKのリリース(GitHub Actions)

1. GitHubの **Actions** タブ → **Android APK Release** を選ぶ
2. **Run workflow** を押す(バージョン名は空ならpackage.jsonの値を使用)
3. ビルドが終わると、`v<バージョン>` のGitHub ReleaseにAPKが添付されます

CI(`CI` ワークフロー)はpush/PRごとにlint・format・typecheck・Metroバンドルを検証します。

### リリース署名(推奨・任意)

Secrets未設定でもAPKはビルドされますが、React Native標準のdebugキーで署名されます。継続して配布するなら、自分のキーストアをSecretsに登録してください(署名が変わるとアップデート時に再インストールが必要になるため、キーストアは大切に保管を)。

```bash
# キーストアを作る
keytool -genkeypair -v -keystore release.keystore -alias yozora \
  -keyalg RSA -keysize 2048 -validity 10000

# base64にしてクリップボードへ(例)
base64 -w0 release.keystore
```

リポジトリの **Settings → Secrets and variables → Actions** に登録:

| Secret | 内容 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | keystoreファイルのbase64 |
| `ANDROID_KEYSTORE_PASSWORD` | ストアのパスワード |
| `ANDROID_KEY_ALIAS` | キーのエイリアス(例: `yozora`) |
| `ANDROID_KEY_PASSWORD` | キーのパスワード |

## 技術スタック

- **Expo SDK 54**(React Native 0.81 / React 19、New Architecture)+ **expo-router**
- **TypeScript**(`strict` + `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes` などの追加フラグ全部入り)
- **@shopify/react-native-skia** — 夜空・オーロラ・星霜の塔・ルナのGPU描画
- **react-native-reanimated 4** — UIスレッドアニメーション
- **expo-sqlite** — キャラ・セリフ・日記・予定・チャット履歴の保存(画像はファイル保存)
- **expo-secure-store** — APIキーの保管
- **Oxlint / Prettier** — エージェントフレンドリー設定(`.oxlintrc.json` / `.prettierrc.json`)
- フォント: [しっぽり明朝](https://fonts.google.com/specimen/Shippori+Mincho)

```
src/
  app/            # expo-router(タブ5画面)
  components/     # UI部品・Skia描画(sky/ character/ home/ ui/)
  lib/            # DB・AIクライアント・天気・バックアップなどのロジック
  state/          # zustandストア(キャラ・タイマー・天気・UI)
scripts/          # アイコン/チャイム生成・CI用署名設定
.github/workflows # CI と APKリリース
```

## ⚠️ 免責事項

- 個人が趣味で作っている無料のツールです。動作の保証はできませんので、自己責任でお使いください
- 予告なく機能が変更・終了する場合があります
- 大切な記録は必ずこまめにバックアップを取ってください

## 📜 ライセンス

このリポジトリのコードは **MITライセンス** で公開しています。改変・再配布・商用利用も自由に行えます(詳しくは `LICENSE` ファイルをご覧ください)。
オリジナルのWeb版は [pppzet/YozoraCompanion](https://github.com/pppzet/YozoraCompanion) です。
なお、アプリ内でユーザーが自分でアップロードするキャラクター画像などの著作権には影響しません。

## 💌 感想・不具合報告

不具合や「こうだったらいいな」があれば、気軽に教えてください🌸
