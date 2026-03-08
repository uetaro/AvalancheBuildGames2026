# Security / セキュリティ

## 機密情報の扱い

### リポジトリに含まれないもの（環境変数で設定）

以下は `.env` や Supabase Secrets で設定し、リポジトリには含めません。

| 変数 | 用途 | 設定場所 |
|------|------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | 管理者権限 API | Supabase Secrets |
| `CHAIN_WORKER_SECRET` | chain-worker 認証 | Supabase Secrets |
| `ISSUER_PRIVATE_KEY` | Avalanche トランザクション署名 | Supabase Secrets |
| `OPENAI_API_KEY` | AI キャリアチャット | Supabase Secrets |
| `RECEIPT_REGISTRY_ADDRESS` | コントラクトアドレス | Supabase Secrets |
| `AVALANCHE_RPC_URL` | RPC エンドポイント | Supabase Secrets（任意） |

### クライアント側で使用するもの

| 変数 | 説明 |
|------|------|
| `publicAnonKey` (Supabase anon) | クライアント用。RLS で保護。公開前提の設計だが、本番では環境変数化を推奨。 |
| `projectId` | Supabase プロジェクト ID。anon key と合わせて `utils/supabase/info.tsx` に記載。 |

### .gitignore

`.env`, `.env.local`, `.env.*.local` は .gitignore に含まれており、コミットされません。
