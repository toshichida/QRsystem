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

発行された **URL** を `web/js/config.js` の `gasWebAppUrl` に記載する。初回は `web/js/config.example.js` を `web/js/config.js` に複製して編集する（`config.js` は `.gitignore` 対象）。

**CORS**: API の `Access-Control-Allow-Origin` はスプレッドシートの **Config** シートの `cors_origin` で変更する（GitHub Pages 本番 URL が決まったらそのオリジンに合わせる）。デプロイ後の確定 URL は [API設計書](./Docs/API設計書.md) の記載と README を更新するとよい。

## 受付フロント（`web/`）

ローカルでは `web/` を静的サーバで開く（`file://` ではカメラや CORS の挙動が制限されることがある）。

```bash
cd web && python3 -m http.server 8080
```

ブラウザで `http://localhost:8080` を開き、`js/config.js` に GAS の `/exec` URL を設定する。

## スプレッドシート側の操作

スプレッドシートを開き、メニュー **「QR受付」** から初期化・テストデータ投入・メール下書き・一斉送信を行う。

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
