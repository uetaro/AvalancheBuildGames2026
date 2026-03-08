# S3 Static Hosting — 3 アプリを 1 バケットにデプロイ

## S3 上の URL 構成

| パス | アプリ | 説明 |
|------|--------|------|
| `/` | staff_web | 管理画面（ログイン → スタッフ/マネージャー画面） |
| `/preview` | staff_web | モバイル 2 台プレビュー（iframe で下記 2 つを表示） |
| `/staff-mobile/` | staff_mobile | スタッフ用モバイルアプリ |
| `/guest-mobile/` | guest_mobile | ゲスト用モバイルアプリ |

## ローカル開発（変更なし）

```bash
# ターミナル 1: 管理画面 + プレビュー
cd 10_UI/staff_web && npm run dev     # http://localhost:3001

# ターミナル 2: スタッフモバイル
cd 10_UI/staff_mobile && npm run dev  # http://localhost:3002

# ターミナル 3: ゲストモバイル
cd 10_UI/guest_mobile && npm run dev  # http://localhost:3003
```

- `http://localhost:3001` → 管理画面
- `http://localhost:3001/preview` → モバイル 2 台プレビュー (localhost:3002 / 3003 を iframe)

## S3 デプロイ手順

### 1. S3 バケット作成

```bash
aws s3 mb s3://heartel-webapp-dev
```

### 2. ビルド & アップロード

```bash
cd 10_UI
./deploy/build-and-sync.sh heartel-webapp-dev
```

### 3. CloudFront 設定

1. CloudFront Distribution を作成
   - Origin: S3 バケット（OAC 推奨）
2. CloudFront Function を作成
   - `deploy/cloudfront-spa-rewrite.js` のコードを登録
   - Distribution の Default Behavior > Viewer request に紐づけ
3. カスタムエラーレスポンスは**不要**（Function がリライトするため）

### 4. 動作確認

```
https://<distribution>.cloudfront.net/           → 管理画面
https://<distribution>.cloudfront.net/preview    → モバイルプレビュー
https://<distribution>.cloudfront.net/staff-mobile/  → スタッフアプリ
https://<distribution>.cloudfront.net/guest-mobile/  → ゲストアプリ
```

## 仕組み

- 各アプリは Vite の `base` オプションでアセットパスを調整
  - staff_web: `base=/` (デフォルト)
  - staff_mobile: `build:s3` で `base=/staff-mobile/`
  - guest_mobile: `build:s3` で `base=/guest-mobile/`
- React Router の `basename` は `import.meta.env.BASE_URL` から自動取得
  - ローカル dev: `BASE_URL=/` → basename なし（従来通り）
  - S3 ビルド: `BASE_URL=/staff-mobile/` → basename 設定
- DevicePreviewPage は `import.meta.env.DEV` で環境判定
  - dev: `http://localhost:3002` / `3003`
  - prod: `/staff-mobile/` / `/guest-mobile/`
- CloudFront Function が SPA ルーティングのリライトを行う
  - `/staff-mobile/app/kudos` → `/staff-mobile/index.html`
  - `/manager/stays` → `/index.html`

## API 通信

API は全て Supabase Edge Functions（`https://<project>.supabase.co/functions/v1/api/...`）を直接呼んでいるため、S3 上でも同じ Supabase プロジェクトに対して通信する。特に CORS 設定変更は不要（Edge Functions は `origin: "*"` で許可済み）。
