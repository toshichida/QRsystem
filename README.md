# QR コード受付システム

イベント参加者向けのメール・QR 発行と、当日の QR 受付（スプレッドシート連携）を行うプロジェクトです。

## ドキュメント

設計・要件は [`Docs/`](./Docs/) を参照してください。

- [要件定義書](./Docs/要件定義書.md)
- [リポジトリ構造定義書](./Docs/リポジトリ構造定義書.md)
- [アーキテクチャ設計書](./Docs/アーキテクチャ設計書.md)
- [API設計書](./Docs/API設計書.md)
- [実装計画書](./Docs/実装計画書.md)

## リポジトリ構成

| ディレクトリ | 内容 |
|--------------|------|
| `gas/` | Google Apps Script（Clasp で push） |
| `web/` | 受付フロント（GitHub Pages 用の静的ファイル） |
| `Docs/` | 要件・設計ドキュメント |

## Clasp（`gas/` をコンテナバインドスクリプトへ反映）

1. [google/clasp](https://github.com/google/clasp) を導入し、`clasp login` で認証する。
2. リポジトリルートの `.clasp.json` に、スプレッドシートに紐づくスクリプトの **scriptId** を設定する（`rootDir` は `gas`）。
3. コードを編集したらリポジトリルートで次を実行する。

```bash
clasp push
```

4. 初回またはスコープ変更後は、GAS エディタで再承認が必要な場合がある。

### `.clasp.json` と scriptId

`scriptId` は共有してよい識別子だが、組織ポリシーで秘匿する場合は `.gitignore` に追加し、README の手順で各自設定する。

## GAS ウェブアプリ（受付 API）のデプロイと URL

受付フロントから `fetch` で呼び出す **ウェブアプリ URL（`/exec`）** は、**GAS エディタで「デプロイ」→「新しいデプロイ」**（種類: ウェブアプリ）で発行する。

- **実行ユーザー**: スプレッドシートにアクセスできるアカウント（例: 自分）
- **アクセスできるユーザー**: 任意（受付端末から呼ぶなら「全員」等を要件に合わせる）

コードを `clasp push` したあと、**変更を反映するには「新しいデプロイ」でバージョンを更新**する必要がある場合がある（「デプロイを管理」から既存デプロイのバージョンを更新）。

発行された **URL** を `web/js/config.js` の `gasWebAppUrl` に記載する（本リポジトリでは `config.js` を追跡し GitHub Pages で配信）。

**CORS**: スプレッドシートの **Config** シートで **`cors_origin`** を、GitHub Pages の**オリジン**（パスは含めない）に合わせる。例: `https://toshichida.github.io`  
（公開 URL: **https://toshichida.github.io/QRsystem/** ）

## GitHub Pages（受付フロント）

- **公開 URL**: [https://toshichida.github.io/QRsystem/](https://toshichida.github.io/QRsystem/)
- `web/` の内容は **`gh-pages` ブランチ**（リポジトリルート＝静的ファイル）から配信する運用とする。
- 初回または `web/` を更新したあと、次で `main` の `web/` を `gh-pages` に反映して push する。

```bash
git subtree split --prefix=web -b gh-pages
git push origin gh-pages:gh-pages --force
git branch -D gh-pages   # ローカルの gh-pages 作業ブランチを削除（任意）
```

- リポジトリの **Settings → Pages** でソースが `gh-pages` / `/ (root)` になっていることを確認する（`gh api` で有効化済みの場合もある）。

## 受付フロント（`web/`）

ローカルでは `web/` を静的サーバで開く（`file://` ではカメラや CORS の挙動が制限されることがある）。

```bash
cd web && python3 -m http.server 8080
```

ブラウザで `http://localhost:8080` を開き、`js/config.js` に GAS の `/exec` URL を設定する。

## スプレッドシート側の操作

スプレッドシートを開き、メニュー **「QR受付」** から初期化・テストデータ投入・メール下書き・一斉送信を行う。

### 受付 API と CORS（ブラウザ）

GitHub Pages など別オリジンから `fetch` する場合、`Content-Type: application/json` だと **CORS プリフライト（OPTIONS）** が発生し、GAS 側で失敗しやすいです。フロント（`web/js/app.js`）は **`application/x-www-form-urlencoded`** で POST し、プリフライトを避けています。API（`doPost`）は JSON POST（curl 用）も同じく受け付けます。

### 受付 API の動作確認（curl の例）

ウェブアプリをデプロイしたあと、`/exec` URL に対して次のように POST できる（`PASSPHRASE` と Config の `passphrase` を一致させる）。

```bash
curl -s -X POST "https://script.google.com/macros/s/…/exec" \
  -H "Content-Type: application/json" \
  -d '{"participantId":"demo-001","staffMemo":"test","passphrase":"CHANGE_ME"}'
```

応答 JSON の `ok` が `true` で、スプレッドシートの `ReceptionLog` に行が追加されていれば成功です。

---

詳細な運用手順（フェーズ 6）は [実装計画書](./Docs/実装計画書.md) に沿って追記予定です。
