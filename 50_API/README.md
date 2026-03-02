# 50_API — Heartel Unified Backend

`10_UI/*/supabase/functions/server/` に分散していた3つの Edge Function を
**一本化**した Supabase Edge Function プロジェクトです。

## ディレクトリ構成

```
50_API/
└── supabase/
    └── functions/
        └── api/
            ├── index.ts                  ← エントリーポイント（全ルートをマウント）
            ├── _shared.ts                ← 共通ユーティリティ・認証ヘルパー
            │
            │  ── Ops ルート (staff_web 由来) ──
            ├── routes_stays.ts           ← POST /ops-checkin, /ops-checkout
            ├── routes_rooms.ts           ← POST /ops-rooms
            ├── routes_cards.ts           ← POST /ops-cards, /ops-cards-all, /ops-update-card-binding
            ├── routes_auth.ts            ← POST /signup, /check-membership, /ops-members
            ├── routes_affiliation_ops.ts ← POST /ops-affiliation-requests, /ops-affiliation-requests-decide
            ├── routes_analytics.ts       ← POST /ops-analytics
            ├── routes_seed.ts            ← POST /seed
            │
            │  ── Staff ルート (staff_mobile 由来) ──
            ├── routes_work.ts            ← POST /work-tap, GET /work-tags, /work-status
            ├── routes_affiliation_req.ts ← GET /company-search, POST /affiliation-request, etc.
            ├── routes_kudos_staff.ts     ← GET /my-kudos, /my-kudos/:id
            ├── routes_profile.ts         ← GET/PUT /my-profile, POST/DELETE /my-profile/avatar
            │
            │  ── Guest ルート (guest_mobile 由来) ──
            ├── routes_entry.ts           ← POST /public-entry-verify
            ├── routes_kudos_guest.ts     ← POST /public-kudos-send
            └── routes_staff_list.ts      ← GET /public-staff-list
```

## エンドポイント一覧

### Ops（スタッフ Web操作・ `/make-server-20781d19/` プレフィックス）

| Method | Path | 説明 |
|--------|------|------|
| POST | `/make-server-20781d19/ops-checkin` | チェックイン |
| POST | `/make-server-20781d19/ops-checkout` | チェックアウト |
| POST | `/make-server-20781d19/ops-rooms` | 客室一覧 |
| POST | `/make-server-20781d19/ops-cards` | 利用可能カード一覧 |
| POST | `/make-server-20781d19/ops-cards-all` | 全カード一覧 |
| POST | `/make-server-20781d19/ops-update-card-binding` | カードバインディング更新 |
| POST | `/make-server-20781d19/signup` | スタッフ新規登録 |
| POST | `/make-server-20781d19/check-membership` | メンバーシップ確認 |
| POST | `/make-server-20781d19/ops-members` | メンバー一覧 |
| POST | `/make-server-20781d19/ops-affiliation-requests` | 所属申請一覧（管理者） |
| POST | `/make-server-20781d19/ops-affiliation-requests-decide` | 申請承認/却下 |
| POST | `/make-server-20781d19/ops-analytics` | アナリティクス |
| POST | `/make-server-20781d19/seed` | シードデータ投入 |

### Staff（スタッフモバイル・ `/make-server-c253248c/` プレフィックス）

| Method | Path | 説明 |
|--------|------|------|
| POST | `/make-server-c253248c/work-tap` | NFC出退勤タップ |
| GET | `/make-server-c253248c/work-tags` | work_tag一覧（デバッグ用） |
| GET | `/make-server-c253248c/work-status` | 現在の勤務状態 |
| GET | `/make-server-c253248c/company-search` | 会社検索 |
| POST | `/make-server-c253248c/affiliation-request` | 所属申請作成 |
| GET | `/make-server-c253248c/my-affiliation-requests` | 自分の申請一覧 |
| DELETE | `/make-server-c253248c/affiliation-request/:id` | 申請キャンセル |
| GET | `/make-server-c253248c/my-kudos` | 受領Kudos一覧 |
| GET | `/make-server-c253248c/my-kudos/:id` | Kudos詳細 |
| GET | `/make-server-c253248c/my-profile` | プロフィール取得 |
| PUT | `/make-server-c253248c/my-profile` | プロフィール更新 |
| POST | `/make-server-c253248c/my-profile/avatar` | アバター画像アップロード |
| DELETE | `/make-server-c253248c/my-profile/avatar` | アバター画像削除 |

### Guest（ゲストモバイル・ `/make-server-14a1e5b0/` プレフィックス）

| Method | Path | 説明 |
|--------|------|------|
| POST | `/make-server-14a1e5b0/public-entry-verify` | NFCタップ・ゲストセッション発行 |
| GET | `/make-server-14a1e5b0/public-staff-list` | 出勤中スタッフ一覧 |
| POST | `/make-server-14a1e5b0/public-kudos-send` | Kudos送信 |

## デプロイ

```bash
# Supabase CLI で Edge Function をデプロイ
supabase functions deploy api --project-ref afyppqxnwbinjaoqikbw
```

## ローカル開発

```bash
# Edge Function をローカルで起動
supabase functions serve api --env-file .env.local
```

`.env.local` に以下を設定:
```
SUPABASE_URL=https://afyppqxnwbinjaoqikbw.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```
