````md id="n4j2c8"
# Heartel 詳細設計書（MVP）
# 管理者（Company Web / manager）：会社紐付け申請 一覧取得（pending中心）

- ドキュメントID: DD-OPS-AFFREQ-LIST
- 版数: v1.0
- 作成日: 2026-03-01
- 対象: Company Web（manager）
- Backend: Supabase（Auth + Postgres + Edge Functions + RPC）
- 対象テーブル: company_member_request / company_member / company / user

---

## 1. 概要

### 1.1 目的
ユーザー（従業員）が提出した「会社紐付け（所属）申請」を、manager が自社分のみ一覧で確認できるようにする。

### 1.2 MVP完了条件
- manager が自社（company_id）の申請一覧を取得できる
- デフォルトは `pending` のみ
- ページングができる
- 一覧には判断に必要な最小情報（申請メモ、申請日時、申請者表示名など）が含まれる

---

## 2. API設計（Edge Function）

### 2.1 Endpoint
- Method: `GET`
- Path: `/functions/v1/ops-affiliation-requests`
- Auth: Supabase Auth（Bearer）

### 2.2 Headers
- `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`

### 2.3 Query Parameters
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| company_id | uuid | YES | 対象会社（manager所属会社） |
| status | text | NO | `pending/approved/rejected/cancelled`（複数はカンマ区切り）※default `pending` |
| limit | int | NO | default 50, max 200 |
| cursor | timestamptz | NO | ページング用（created_atの末尾） |
| q | text | NO | 申請メモ/表示名の部分一致（MVP任意） |

例:
- `/ops-affiliation-requests?company_id=...`（pendingのみ）
- `/ops-affiliation-requests?company_id=...&status=pending,approved&limit=50`

### 2.4 Response
```json
{
  "items": [
    {
      "company_member_request_id": "d7e6e2b7-ccf0-4bb0-9d3b-5f3c6c3c1111",
      "user_id": "3c2b0e77-1111-2222-3333-444455556666",
      "app_display_name": "Sato",
      "requested_role": "employee",
      "request_status": "pending",
      "request_note": "Front Desk / employee id: 12345",
      "review_note": null,
      "reviewed_by_company_member_id": null,
      "reviewed_at": null,
      "version": 1,
      "created_at": "2026-03-01T10:00:00+09:00",
      "updated_at": "2026-03-01T10:00:00+09:00"
    }
  ],
  "next_cursor": null
}
````

items要素（MVP）

| 項目                            | 型                | 説明                                  |
| ----------------------------- | ---------------- | ----------------------------------- |
| company_member_request_id     | uuid             | 申請ID                                |
| user_id                       | uuid             | 申請者（Supabase auth uid）              |
| app_display_name              | text             | 表示名（user.display_name）              |
| requested_role                | text             | 申請ロール（MVP: employee固定）              |
| request_status                | text             | pending/approved/rejected/cancelled |
| request_note                  | text/null        | 申請メモ                                |
| review_note                   | text/null        | 判断メモ（承認/却下理由）                       |
| reviewed_by_company_member_id | uuid/null        | 承認者/却下者                             |
| reviewed_at                   | timestamptz/null | 判断日時                                |
| version                       | int              | 楽観ロック用                              |
| created_at                    | timestamptz      | 申請日時                                |
| updated_at                    | timestamptz      | 更新日時                                |

---

## 3. 認証・認可

### 3.1 認証

* `auth.getUser()` により `auth_user_id` を取得できること
* 失敗 → 401

### 3.2 認可（manager権限）

* `company_member` に以下を満たす行が存在すること

  * `company_id = query.company_id`
  * `user_id = auth_user_id`
  * `member_role = 'manager'`
  * `member_status = 'active'`
* 満たさない → 403

---

## 4. 取得ロジック（DB）

### 4.1 抽出条件

* `company_member_request.company_id = company_id`
* `request_status IN (:statuses)`（default pending）
* ページング：`created_at < cursor`（created_at desc）

### 4.2 Join（表示名）

* `company_member_request.user_id -> user.user_id` をJOINし `user.display_name` を `app_display_name` として返す

---

## 5. エラー設計

| HTTP | error_code       | 条件                            |
| ---- | ---------------- | ----------------------------- |
| 401  | UNAUTHORIZED     | token不正/期限切れ                  |
| 403  | FORBIDDEN        | manager権限なし                   |
| 400  | VALIDATION_ERROR | company_id欠落、status不正、limit不正 |
| 500  | INTERNAL_ERROR   | 予期しない例外                       |

---

## 6. 推奨インデックス

* `company_member_request(company_id, request_status, created_at desc)`
* `company_member(company_id, user_id)`（manager判定）
* `user(user_id)`（PK）

---

````

```md id="q7f3d1"
# Heartel 詳細設計書（MVP）
# 管理者（Company Web / manager）：会社紐付け申請 承認/却下（Approve/Reject）

- ドキュメントID: DD-OPS-AFFREQ-DECIDE
- 版数: v1.0
- 作成日: 2026-03-01
- 対象: Company Web（manager）
- Backend: Supabase（Auth + Postgres + Edge Functions + RPC）
- 対象テーブル: company_member_request / company_member / audit_log

---

## 1. 概要

### 1.1 目的
manager が自社の `company_member_request`（所属申請）に対して、Approve（承認）または Reject（却下）を実行する。

承認時は `company_member`（所属）を作成または更新して `member_status='active'` にする。

### 1.2 MVP完了条件
- managerのみが判断APIを実行できる
- `pending` の申請のみ判断できる（二重処理防止）
- 承認で `company_member` が active になる
- 却下で request_status が rejected になる
- version（楽観ロック）で競合（別managerの同時判断）を防ぐ
- 監査ログが残る（推奨）

---

## 2. API設計（Edge Function）

### 2.1 Endpoint
- Method: `POST`
- Path: `/functions/v1/ops-affiliation-requests/decide`
- Auth: Supabase Auth（Bearer）

### 2.2 Headers
- `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`
- `Content-Type: application/json`

### 2.3 Request Body
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| company_id | uuid | YES | 判断対象会社 |
| company_member_request_id | uuid | YES | 判断対象申請 |
| decision | text | YES | `approve` or `reject` |
| review_note | text | NO | 判断メモ（却下理由など） |
| granted_role | text | NO | 承認時に付与するロール（default: `employee`） |
| expected_version | int | YES | 申請レコードのversion（楽観ロック） |
| decided_at | timestamptz | NO | 未指定は now() |
| client_request_id | text | NO | 相関ID |

入力例（approve）:
```json
{
  "company_id": "10000000-0000-0000-0000-000000000001",
  "company_member_request_id": "d7e6e2b7-ccf0-4bb0-9d3b-5f3c6c3c1111",
  "decision": "approve",
  "granted_role": "employee",
  "review_note": "Approved by manager",
  "expected_version": 1,
  "client_request_id": "affdec-20260301-0001"
}
````

入力例（reject）:

```json
{
  "company_id": "10000000-0000-0000-0000-000000000001",
  "company_member_request_id": "d7e6e2b7-ccf0-4bb0-9d3b-5f3c6c3c1111",
  "decision": "reject",
  "review_note": "Employee ID mismatch",
  "expected_version": 1
}
```

### 2.4 Response

成功（200）

| 項目                            | 型           | 説明                             |
| ----------------------------- | ----------- | ------------------------------ |
| company_member_request_id     | uuid        | 申請ID                           |
| request_status                | text        | `approved` or `rejected`       |
| reviewed_at                   | timestamptz | 判断日時                           |
| reviewed_by_company_member_id | uuid        | 判断者（managerのcompany_member_id） |
| company_member_id             | uuid/null   | 承認時に作成/更新された所属ID（reject時はnull） |
| version                       | int         | 更新後version                     |

例（approve）:

```json
{
  "company_member_request_id": "d7e6e2b7-ccf0-4bb0-9d3b-5f3c6c3c1111",
  "request_status": "approved",
  "reviewed_at": "2026-03-01T11:00:00+09:00",
  "reviewed_by_company_member_id": "a1a1a1a1-....",
  "company_member_id": "b2b2b2b2-....",
  "version": 2
}
```

---

## 3. 認証・認可

### 3.1 認証

* `auth.getUser()` により `auth_user_id` を取得
* 失敗 → 401

### 3.2 認可（manager）

* `company_member` に以下を満たす行がある

  * `company_id = request.company_id`
  * `user_id = auth_user_id`
  * `member_role='manager'`
  * `member_status='active'`
* 満たさない → 403

---

## 4. バリデーション（必須）

* `decision in ('approve','reject')`
* `expected_version` 必須
* 申請が存在し、`company_id` が一致すること
* 申請の現在状態が `pending` であること（それ以外は 409）
* `granted_role`（approve時）は `employee/staff/manager` のいずれか（MVPは employee のみ許可でも良い）

---

## 5. DB更新方式（RPC必須：トランザクション）

### 5.1 RPC名

* `ops_decide_company_member_request`

### 5.2 引数

| 引数                          | 型           | 必須  |
| --------------------------- | ----------- | --- |
| p_company_id                | uuid        | YES |
| p_company_member_request_id | uuid        | YES |
| p_decision                  | text        | YES |
| p_review_note               | text        | NO  |
| p_granted_role              | text        | NO  |
| p_expected_version          | int         | YES |
| p_actor_company_member_id   | uuid        | YES |
| p_decided_at                | timestamptz | NO  |

### 5.3 更新内容

承認（approve）の場合

* `company_member_request`

  * `request_status='approved'`
  * `review_note`, `reviewed_by_company_member_id`, `reviewed_at`
  * `version=version+1`, `updated_at=now()`
* `company_member`

  * （既存がなければ）INSERT（`member_status='active'`, `member_role=p_granted_role`, `version=1`）
  * （既存があれば）UPDATE（`member_status='active'`, `member_role`更新可, `ended_at=null`, `version+1`）
* `audit_log`（推奨）

  * `action='AFFILIATION_REQUEST_APPROVE'`

却下（reject）の場合

* `company_member_request`

  * `request_status='rejected'` + reviewed情報
* `company_member` は変更しない
* `audit_log`（推奨）

  * `action='AFFILIATION_REQUEST_REJECT'`

---

## 6. 競合（同時判断）対策

* `company_member_request` を `FOR UPDATE` でロック
* `expected_version` を WHERE句に入れて楽観ロック
* `request_status!='pending'` なら 409（ALREADY_DECIDED）

---

## 7. エラー設計

| HTTP | error_code        | 条件                                       |
| ---- | ----------------- | ---------------------------------------- |
| 401  | UNAUTHORIZED      | token不正                                  |
| 403  | FORBIDDEN         | manager権限なし                              |
| 400  | VALIDATION_ERROR  | decision/granted_role/expected_version不正 |
| 404  | REQUEST_NOT_FOUND | 申請が存在しない/会社不一致                           |
| 409  | VERSION_CONFLICT  | expected_version不一致                      |
| 409  | ALREADY_DECIDED   | pending以外（approved/rejected/cancelled）   |
| 500  | INTERNAL_ERROR    | 予期しない例外                                  |

---

## 8. 監査ログ（推奨）

* Approve:

  * `action='AFFILIATION_REQUEST_APPROVE'`
* Reject:

  * `action='AFFILIATION_REQUEST_REJECT'`
* `target_table='company_member_request'`
* `target_id=company_member_request_id`
* `actor_company_member_id=manager`
* `company_id`
* `detail_json` に `decision/granted_role/review_note`（機微情報は入れない）

---

## 9. RPC SQL雛形（MVP）

```sql id="m4c7u1"
create or replace function ops_decide_company_member_request(
  p_company_id uuid,
  p_company_member_request_id uuid,
  p_decision text,
  p_review_note text default null,
  p_granted_role text default null,
  p_expected_version int,
  p_actor_company_member_id uuid,
  p_decided_at timestamptz default null
)
returns table (
  company_member_request_id uuid,
  request_status text,
  reviewed_at timestamptz,
  reviewed_by_company_member_id uuid,
  company_member_id uuid,
  version int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := coalesce(p_decided_at, now());
  v_user_id uuid;
  v_curr_status text;
  v_curr_version int;
  v_role text := coalesce(p_granted_role, 'employee');
  v_company_member_id uuid;
begin
  -- 1) lock request
  select r.user_id, r.request_status, r.version
    into v_user_id, v_curr_status, v_curr_version
  from company_member_request r
  where r.company_member_request_id = p_company_member_request_id
    and r.company_id = p_company_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode='P0001';
  end if;

  if v_curr_version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode='P0001';
  end if;

  if v_curr_status <> 'pending' then
    raise exception 'ALREADY_DECIDED' using errcode='P0001';
  end if;

  if p_decision not in ('approve','reject') then
    raise exception 'VALIDATION_ERROR: decision' using errcode='P0001';
  end if;

  if p_decision = 'approve' then
    if v_role not in ('employee','staff','manager') then
      raise exception 'VALIDATION_ERROR: granted_role' using errcode='P0001';
    end if;

    -- 2) upsert company_member (unique(company_id,user_id) 推奨前提)
    select cm.company_member_id
      into v_company_member_id
    from company_member cm
    where cm.company_id = p_company_id
      and cm.user_id = v_user_id
    limit 1;

    if v_company_member_id is null then
      insert into company_member (
        company_member_id,
        company_id,
        user_id,
        member_role,
        member_status,
        ended_at,
        version,
        created_at,
        updated_at
      ) values (
        gen_random_uuid(),
        p_company_id,
        v_user_id,
        v_role,
        'active',
        null,
        1,
        now(),
        now()
      )
      returning company_member.company_member_id into v_company_member_id;
    else
      update company_member
      set member_role = v_role,
          member_status = 'active',
          ended_at = null,
          version = version + 1,
          updated_at = now()
      where company_member_id = v_company_member_id;
    end if;

    -- 3) update request -> approved
    update company_member_request
    set request_status = 'approved',
        review_note = p_review_note,
        reviewed_by_company_member_id = p_actor_company_member_id,
        reviewed_at = v_now,
        version = version + 1,
        updated_at = now()
    where company_member_request_id = p_company_member_request_id;

    -- 4) audit_log (optional)
    insert into audit_log (
      audit_log_id,
      actor_company_member_id,
      company_id,
      action,
      target_table,
      target_id,
      detail_json,
      version,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      p_actor_company_member_id,
      p_company_id,
      'AFFILIATION_REQUEST_APPROVE',
      'company_member_request',
      p_company_member_request_id,
      jsonb_build_object('decision','approve','granted_role',v_role),
      1,
      now(),
      now()
    );

    company_member_id := v_company_member_id;

  else
    -- reject
    update company_member_request
    set request_status = 'rejected',
        review_note = p_review_note,
        reviewed_by_company_member_id = p_actor_company_member_id,
        reviewed_at = v_now,
        version = version + 1,
        updated_at = now()
    where company_member_request_id = p_company_member_request_id;

    insert into audit_log (
      audit_log_id,
      actor_company_member_id,
      company_id,
      action,
      target_table,
      target_id,
      detail_json,
      version,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      p_actor_company_member_id,
      p_company_id,
      'AFFILIATION_REQUEST_REJECT',
      'company_member_request',
      p_company_member_request_id,
      jsonb_build_object('decision','reject'),
      1,
      now(),
      now()
    );

    company_member_id := null;
  end if;

  -- 5) return latest request
  return query
  select r.company_member_request_id,
         r.request_status,
         r.reviewed_at,
         r.reviewed_by_company_member_id,
         v_company_member_id,
         r.version
  from company_member_request r
  where r.company_member_request_id = p_company_member_request_id;

end;
$$;
```

---

## 10. テスト観点（MVP）

承認

* pending申請をapprove → requestがapproved、company_memberがactive、監査ログ
* 既にcompany_memberがある（ended等）→ activeに復帰できる

却下

* pending申請をreject → requestがrejected、company_memberは変化なし

競合

* expected_version不一致 → 409（VERSION_CONFLICT）
* pending以外（approved/rejected）→ 409（ALREADY_DECIDED）

権限

* manager以外 → 403
* 他社company_id → 403/404（情報漏えいしない）

---

```
```
