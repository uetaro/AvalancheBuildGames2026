````md id="b2n6p8"
# Heartel 詳細設計書（MVP）
# 従業員：所属申請（Company Affiliation Request）& マネージャー：申請一覧取得 ※Supabase Auth 前提

- ドキュメントID: DD-AFFILIATION
- 版数: v1.0
- 作成日: 2026-03-01
- 対象: 従業員アプリ（Account）/ Company Web（manager）
- Backend: Supabase（Auth + Postgres + Edge Functions + RPC）
- 関連機能:
  - E-A-05 所属（会社申請・状況）
  - W-08 所属管理（承認/却下）

---

## 1. 概要

### 1.1 目的
従業員（Employee）が「自分はこのホテルの従業員です」という所属申請を行い、ホテル側（Manager）が申請を一覧で確認できるようにする。  
承認/却下は別設計書（本書のスコープ外）とし、本書では **申請作成** と **申請一覧取得** までを定義する。

### 1.2 MVPの完了条件
- 従業員が所属申請を作成できる
- 同一ユーザー・同一会社に対して「重複申請」を防止できる
- マネージャーが自社の申請一覧を取得できる（pending中心）
- 申請は後続の承認/却下フローに接続できる（status管理）

---

## 2. スコープ

### 2.1 対象ロール
- 申請作成：Employee（従業員アプリ）
- 申請一覧取得：Manager（Company Web）

### 2.2 認証
- すべて Supabase Auth（Bearer token）

### 2.3 対象外（MVP）
- 承認/却下 API（別設計書に分離）
- 会社検索API（既存の `company search` で対応）
- 本人確認（社員番号/身分証等）を厳格化する（MVPは任意項目として残す）

---

## 3. データ設計（前提）

### 3.1 既存テーブル（利用）
- `company`（申請先会社）
- `company_member`（所属そのもの：承認されたら active になる）
- `user`（Supabase auth uidで特定）

### 3.2 追加テーブル（MVPで必要）
申請を `company_member` に直接入れる方式も可能だが、承認前の状態管理が面倒になりやすいので、MVPでも申請専用テーブルを用意するのが安全。

テーブル名: `company_member_request`（単数）
- 目的：所属申請の状態管理（pending/approved/rejected/cancelled）

推奨カラム（最小）
- `company_member_request_id uuid PK default gen_random_uuid()`
- `company_id uuid not null references company(company_id)`
- `user_id uuid not null`（Supabase auth uid。`user.user_id` と同一設計ならFK可）
- `request_status text not null`（`pending/approved/rejected/cancelled`）
- `requested_role text not null`（MVP: `'employee'` 固定）
- `request_note text null`（任意：自己申告メモ）
- `review_note text null`（managerが見るメモ。作成時はnull）
- `reviewed_by_company_member_id uuid null references company_member(company_member_id)`（承認者）
- `reviewed_at timestamptz null`
- `version int not null default 1`
- `created_at/updated_at timestamptz not null default now()`

重複防止（必須）
- 同一会社・同一ユーザーで pending を1つにする（部分ユニーク）
  - `unique(company_id, user_id) where request_status='pending'`

DDL例:
```sql id="3a3sza"
create table if not exists company_member_request (
  company_member_request_id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(company_id),
  user_id uuid not null,
  request_status text not null,
  requested_role text not null,
  request_note text null,
  review_note text null,
  reviewed_by_company_member_id uuid null references company_member(company_member_id),
  reviewed_at timestamptz null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_company_member_request_pending_one
on company_member_request(company_id, user_id)
where request_status = 'pending';

create index if not exists ix_company_member_request_company_status
on company_member_request(company_id, request_status, created_at desc);
````

---

## 4. API① 従業員：所属申請作成（Create Request）

### 4.1 Endpoint

* Method: `POST`
* Path: `/functions/v1/employee-affiliation-request`
* Auth: Supabase Auth（Bearer）

### 4.2 Request

Headers:

* `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`
* `Content-Type: application/json`

Body:

| 項目                | 型    | 必須  | 説明                     |
| ----------------- | ---- | --- | ---------------------- |
| company_id        | uuid | YES | 申請先会社                  |
| request_note      | text | NO  | 任意メモ（社員番号などはMVPでは自由入力） |
| client_request_id | text | NO  | 相関ID                   |

入力例:

```json
{
  "company_id": "10000000-0000-0000-0000-000000000001",
  "request_note": "Front Desk / employee id: 12345",
  "client_request_id": "affreq-20260301-0001"
}
```

### 4.3 Response

成功（201）:

| 項目                        | 型           | 説明                |
| ------------------------- | ----------- | ----------------- |
| company_member_request_id | uuid        | 作成された申請ID         |
| request_status            | text        | `pending`         |
| requested_role            | text        | `employee`（MVP固定） |
| created_at                | timestamptz | 作成日時              |

例:

```json id="tq5h8k"
{
  "company_member_request_id": "d7e6e2b7-ccf0-4bb0-9d3b-5f3c6c3c1111",
  "request_status": "pending",
  "requested_role": "employee",
  "created_at": "2026-03-01T10:00:00+09:00"
}
```

### 4.4 認証・認可

* 認証：`auth.getUser()` で `auth_user_id` を取得
* 認可（MVP）：

  * 申請作成自体は誰でも可能だが、以下を弾く

    1. `company.company_status!='active'` の会社への申請（409/423）
    2. すでに `company_member` に `active` 所属している（409）
    3. `company_member_request` に pending が存在する（409）

### 4.5 バリデーション

* company_id存在
* company_status='active'
* pending重複防止（DB制約＋事前チェック）

### 4.6 エラー

| HTTP | error_code              | 条件                |
| ---- | ----------------------- | ----------------- |
| 401  | UNAUTHORIZED            | トークン不正            |
| 400  | VALIDATION_ERROR        | company_id欠落/形式不正 |
| 404  | COMPANY_NOT_FOUND       | companyが存在しない     |
| 409  | ALREADY_MEMBER          | すでにactive所属がある    |
| 409  | REQUEST_ALREADY_PENDING | すでにpending申請がある   |
| 423  | COMPANY_SUSPENDED       | 会社が停止             |
| 500  | INTERNAL_ERROR          | 予期しない例外           |

---

## 5. API② マネージャー：所属申請一覧取得（List Requests）

### 5.1 Endpoint

* Method: `GET`
* Path: `/functions/v1/ops-affiliation-requests`
* Auth: Supabase Auth（Bearer）

### 5.2 Query Parameters

| 項目         | 型           | 必須  | 説明                                                     |
| ---------- | ----------- | --- | ------------------------------------------------------ |
| company_id | uuid        | YES | 自社（managerの所属会社）                                       |
| status     | text        | NO  | `pending/approved/rejected/cancelled`（default pending） |
| limit      | int         | NO  | default 50, max 200                                    |
| cursor     | timestamptz | NO  | created_at基準のページング                                     |

例:

* `/ops-affiliation-requests?company_id=...`（pendingのみ）
* `/ops-affiliation-requests?company_id=...&status=pending,approved&limit=50`

### 5.3 Response

| 項目          | 型                | 説明   |
| ----------- | ---------------- | ---- |
| items       | array            | 申請一覧 |
| next_cursor | timestamptz/null | 次ページ |

items要素（MVP）:

| 項目                        | 型           | 説明                   |
| ------------------------- | ----------- | -------------------- |
| company_member_request_id | uuid        | 申請ID                 |
| user_id                   | uuid        | 申請者（Supabase uid）    |
| request_status            | text        | 状態                   |
| requested_role            | text        | 申請ロール（MVP: employee） |
| request_note              | text/null   | 申請メモ                 |
| created_at                | timestamptz | 申請日時                 |

例:

```json
{
  "items": [
    {
      "company_member_request_id": "d7e6e2b7-ccf0-4bb0-9d3b-5f3c6c3c1111",
      "user_id": "3c2b0e77-1111-2222-3333-444455556666",
      "request_status": "pending",
      "requested_role": "employee",
      "request_note": "Front Desk / employee id: 12345",
      "created_at": "2026-03-01T10:00:00+09:00"
    }
  ],
  "next_cursor": null
}
```

### 5.4 認証・認可（必須）

* 認証：`auth.getUser()` で `auth_user_id`
* 認可：

  * `company_member` に以下を満たす行がある

    * `company_id = query.company_id`
    * `user_id = auth_user_id`
    * `member_role = 'manager'`
    * `member_status = 'active'`
  * 満たさなければ 403

※`company_id` をクライアントから渡す設計はIDORの入口になりやすいが、上の突合で防げる。より堅くするなら「ログイン者のcompany_idはサーバで確定し、queryから受け取らない」方式も可（MVPでは現状でOK）。

### 5.5 エラー

| HTTP | error_code       | 条件                            |
| ---- | ---------------- | ----------------------------- |
| 401  | UNAUTHORIZED     | トークン不正                        |
| 403  | FORBIDDEN        | manager権限なし / 所属なし            |
| 400  | VALIDATION_ERROR | company_id欠落、status不正、limit不正 |
| 500  | INTERNAL_ERROR   | 予期しない例外                       |

---

## 6. DB更新方式（RPC推奨）

### 6.1 所属申請作成（RPC）

* RPC名: `employee_create_company_member_request`
* 引数: `p_company_id uuid, p_user_id uuid, p_request_note text, p_requested_role text`
* 戻り値: `company_member_request_id, request_status, created_at`

処理（トランザクション）

1. company存在＆active確認
2. 既存 `company_member(active)` を確認し、あれば ALREADY_MEMBER
3. pending申請があれば REQUEST_ALREADY_PENDING
4. INSERT（pending）

### 6.2 申請一覧取得（RPCは任意）

単純SELECTなのでEdge Function直クエリでも良い。再利用するならRPC化:

* `ops_list_company_member_requests(p_company_id uuid, p_statuses text[], p_limit int, p_cursor timestamptz)`

---

## 7. 監査ログ（任意だが推奨）

* 従業員が申請作成:

  * `action='AFFILIATION_REQUEST_CREATE'`
  * `target_table='company_member_request'`
  * `target_id=company_member_request_id`
  * `actor_user_id=auth_user_id`
* managerが一覧取得は監査不要（必要なら `READ_*` を入れる）

---

## 8. テスト観点（MVP）

申請作成

* 初回申請 → pending作成
* pendingが既にある → 409
* active所属がある → 409
* companyがsuspended → 423
* company_id不正 → 404/400

申請一覧（manager）

* managerが自社のpending一覧取得できる
* staff/employeeが叩くと403
* statusフィルタが効く
* ページングが動く（limit/cursor）

---

```
```
