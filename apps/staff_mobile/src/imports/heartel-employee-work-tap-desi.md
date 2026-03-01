````md
# Heartel 詳細設計書（MVP）
# Employee：NFCタップ出退勤（Work Tap → Clock-in/Clock-out）※Supabase Auth 前提

- ドキュメントID: DD-EMP-WORK-TAP
- 版数: v1.0
- 作成日: 2026-03-01
- 対象: 従業員（個人アプリ：スマホ）Workタブ（出勤/退勤）
- Backend: Supabase（Auth + Postgres + Edge Functions + RPC）
- 目的: ネイティブアプリでNFCタグをタップした際に、所属会社判定と「出勤/退勤」の自動判定（またはタグ意図）に応じて勤怠処理を実行する

---

## 1. 概要

### 1.1 目的
従業員が現場のNFCタグにタップすると、バックエンドが以下を満たす形で出勤/退勤を確定し、`on_duty_session` を作成/終了する。

- タグが紐づく会社（company_id）と、ユーザーの所属（company_member）を突合し「自分の会社か」を判定する
- 出勤/退勤の判定は、原則バックエンド側の状態（退勤未入力の有無）で決める
- ただしタグ側で「出勤専用/退勤専用/自動」を持てる（意図によって挙動が変わる）

### 1.2 MVPの完了条件
- NFCタップ → API呼び出し → 出勤または退勤が完了する
- 未終了（退勤未記録）の勤務レコードがあれば次は退勤、なければ出勤（autoの場合）
- タグが別会社の場合は拒否される（403）
- 二重タップ/同時タップでも整合が崩れない（トランザクション + 排他）

---

## 2. スコープ

### 2.1 対象ロール
- 従業員アプリで勤怠を行うユーザー
- 認可は `company_member` により判定
  - MVP推奨: `member_role='employee'` のみ許可  
  - ※運用で staff/manager も出退勤対象なら `in ('employee','staff','manager')` に拡張可能

### 2.2 対象外（MVP）
- オフライン出退勤（ローカルキュー）
- 位置情報/GPS、顔認証など追加要素
- 勤怠の修正申請、承認フロー

---

## 3. 前提（Supabase Auth）

- ネイティブアプリは Supabase Auth でログイン済み（`access_token` を保持）
- 業務APIは Edge Function を経由する
- Edge Function 内で `auth.getUser()` を行い、`auth_user_id`（UUID）を取得する

---

## 4. NFCタグ仕様（必要な情報・設定）

### 4.1 NFCタグに書く内容（NDEF）
NFCタグ（現場用のWorkタグ）には URL を書き込む。

例（Universal Link / App Link 推奨）:
- `https://app.heartel.xyz/work/tap?t=<work_tag_public_id>`

例（Custom scheme）:
- `heartel://work/tap?t=<work_tag_public_id>`

> **重要**: タグに入れるのは `work_tag_public_id` のみ（公開識別子）。内部PK（work_tag_id）は外に出さない。

### 4.2 一度書いたら変更不可にしたい
- タグ書き込み後に **write-protect（ロック）** できるタグを採用する
- ロックできない場合でも `work_tag.work_tag_status='revoked'` により無効化できる（運用の最後の砦）

---

## 5. データ設計（SQLで作成済み前提）

### 5.1 work_tag（現場NFCタグ）
（作成済み想定）

必須カラム（本設計で利用するもの）
- `work_tag_id`（PK）
- `work_tag_public_id`（URLに入れる公開ID、UK）
- `company_id`（所属会社）
- `work_tag_status`（`active/revoked`）
- `intended_action`（`auto/clockin/clockout`）
- `work_tag_label`（任意）
- `version`, `created_at`, `updated_at`

### 5.2 on_duty_session（勤務中セッション）
本設計で前提とするカラム（既存設計）
- `on_duty_session_id`（PK）
- `company_id`
- `company_member_id`
- `duty_status`（`active/ended`）
- `started_at`, `ended_at`
- `version`, `created_at`, `updated_at`

推奨追加（未導入なら追加推奨）
- `started_work_tag_id uuid null`（出勤に使ったタグ）
- `ended_work_tag_id uuid null`（退勤に使ったタグ）
- `started_attestation text not null default 'manual'`（`nfc/manual`）
- `ended_attestation text null`

---

## 6. API設計（Edge Function）

### 6.1 Endpoint
- Method: `POST`
- Path: `/functions/v1/employee-work-tap`
- Auth: Supabase Auth（Bearer）

### 6.2 Headers
- `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`
- `Content-Type: application/json`

### 6.3 Request Body
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| work_tag_public_id | uuid | YES | NFC URLから得る公開タグID |
| tapped_at | timestamptz | NO | 未指定は now() |
| client_request_id | text | NO | 相関ID（ログ用、任意） |

例:
```json
{
  "work_tag_public_id": "2bcb25c5-2d9e-4b31-8a2a-3b5d8f1b9c11",
  "tapped_at": "2026-03-01T09:00:00+09:00",
  "client_request_id": "worktap-20260301-0001"
}
````

### 6.4 Response（成功）

| 項目                 | 型                | 説明                      |
| ------------------ | ---------------- | ----------------------- |
| action             | text             | `clockin` or `clockout` |
| company_id         | uuid             | タグの会社                   |
| on_duty_session_id | uuid             | 勤怠セッションID               |
| started_at         | timestamptz/null | 出勤時のみ                   |
| ended_at           | timestamptz/null | 退勤時のみ                   |
| message            | text             | UI表示用（短文）               |

例（出勤）:

```json
{
  "action": "clockin",
  "company_id": "7bb7d2d4-2bb2-4bf0-a5e1-8c4f4e6e2f8d",
  "on_duty_session_id": "9d9c7c3d-8f8e-4b2a-a81b-3b1d3c3b9999",
  "started_at": "2026-03-01T09:00:00+09:00",
  "ended_at": null,
  "message": "出勤しました"
}
```

例（退勤）:

```json
{
  "action": "clockout",
  "company_id": "7bb7d2d4-2bb2-4bf0-a5e1-8c4f4e6e2f8d",
  "on_duty_session_id": "9d9c7c3d-8f8e-4b2a-a81b-3b1d3c3b9999",
  "started_at": null,
  "ended_at": "2026-03-01T18:00:00+09:00",
  "message": "退勤しました"
}
```

---

## 7. 認証・認可（必須）

### 7.1 認証

* Edge Function で `auth.getUser()` を実行し `auth_user_id` を取得
* 取得できなければ 401

### 7.2 認可（自分の会社か判定）

* `work_tag_public_id` → `work_tag.company_id` を確定
* `company_member` に以下を満たす行が存在すること

  * `company_id = work_tag.company_id`
  * `user_id = auth_user_id`
  * `member_status='active'`
  * `member_role` は許可範囲（MVPは employee）

満たさなければ 403（別会社のタグをタップした扱いで拒否）

---

## 8. 出勤/退勤の判定ルール（要件の核）

### 8.1 タグ意図（intended_action）

* `auto`：バックエンドの状態で出勤/退勤を決定
* `clockin`：出勤専用
* `clockout`：退勤専用

### 8.2 判定ロジック

まず「未終了の勤務（退勤未入力）」を検索する。

* 未終了セッション定義：

  * `on_duty_session.company_member_id = <本人>`
  * `duty_status='active'`

分岐：

* intended_action = `auto`

  * activeセッションなし → **clockin（出勤）**
  * activeセッションあり → **clockout（退勤）**
* intended_action = `clockin`

  * activeセッションあり → 409（`ALREADY_ON_DUTY`）
  * activeセッションなし → clockin
* intended_action = `clockout`

  * activeセッションなし → 409（`NOT_ON_DUTY`）
  * activeセッションあり → clockout

> ユーザーの要望「退勤が入っていないなら次は退勤」は、`auto` のこのロジックで実現。

---

## 9. DB更新方式（RPCでトランザクション必須）

### 9.1 RPC名

* `employee_work_tap`

### 9.2 RPC引数（推奨）

| 引数                   | 型           | 必須  | 説明                |
| -------------------- | ----------- | --- | ----------------- |
| p_work_tag_public_id | uuid        | YES | タグ公開ID            |
| p_auth_user_id       | uuid        | YES | Supabase auth uid |
| p_tapped_at          | timestamptz | NO  | nullならnow         |

### 9.3 RPC戻り値

* `action text`（clockin/clockout）
* `company_id uuid`
* `on_duty_session_id uuid`
* `started_at timestamptz`
* `ended_at timestamptz`

---

## 10. 排他・整合性（二重タップ対策）

### 10.1 必須制約（推奨）

同一人物が同時に複数の active セッションを持てないようにする。

* `partial unique(company_member_id) where duty_status='active'`

例（DDL）:

```sql
create unique index if not exists ux_on_duty_active_one_per_member
on on_duty_session(company_member_id)
where duty_status = 'active';
```

### 10.2 RPC内ロック

* `work_tag` を `FOR UPDATE` で取得（revoked/intentの整合）
* 対象 `company_member` の active on_duty_session を `FOR UPDATE` 相当で確保（もしくは UPDATE/INSERT時の制約で弾く）

---

## 11. エラー設計

エラー形式:

```json
{
  "error_code": "ALREADY_ON_DUTY",
  "message": "You are already on duty.",
  "details": {}
}
```

| HTTP | error_code           | 条件                        |
| ---- | -------------------- | ------------------------- |
| 401  | UNAUTHORIZED         | Authトークン不正                |
| 403  | FORBIDDEN_NOT_MEMBER | 該当会社に所属していない              |
| 403  | FORBIDDEN_ROLE       | ロール不正（employeeでない等）       |
| 404  | WORK_TAG_NOT_FOUND   | work_tag_public_id が存在しない |
| 409  | WORK_TAG_REVOKED     | work_tag_status='revoked' |
| 409  | ALREADY_ON_DUTY      | clockin専用で既にactive        |
| 409  | NOT_ON_DUTY          | clockout専用でactiveなし       |
| 400  | VALIDATION_ERROR     | パラメータ欠落/形式不正              |
| 500  | INTERNAL_ERROR       | 予期しない例外                   |

---

## 12. 監査ログ（audit_log）

MVP推奨：出退勤を監査ログに残す（後で運用トラブルが減る）

* 出勤時:

  * `action='CLOCK_IN'`
  * `target_table='on_duty_session'`
  * `target_id=on_duty_session_id`
  * `detail_json`: `work_tag_id`, `work_tag_label`, `tapped_at`, `attestation='nfc'`
* 退勤時:

  * `action='CLOCK_OUT'`（同様）

---

## 13. RPC（SQL雛形 / MVP）

前提：

* `work_tag` / `company_member` / `on_duty_session` が存在
* `pgcrypto`（`gen_random_uuid()`）利用
* 例外は `raise exception` を簡略化し、Edge Function側で `error_code` にマップ（MVP）

```sql
create or replace function employee_work_tap(
  p_work_tag_public_id uuid,
  p_auth_user_id uuid,
  p_tapped_at timestamptz default null
)
returns table (
  action text,
  company_id uuid,
  on_duty_session_id uuid,
  started_at timestamptz,
  ended_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := coalesce(p_tapped_at, now());
  v_work_tag_id uuid;
  v_company_id uuid;
  v_work_tag_status text;
  v_intended_action text;

  v_member_id uuid;
  v_member_role text;
  v_member_status text;

  v_active_session_id uuid;
begin
  -- 1) load+lock work_tag
  select wt.work_tag_id, wt.company_id, wt.work_tag_status, wt.intended_action
    into v_work_tag_id, v_company_id, v_work_tag_status, v_intended_action
  from work_tag wt
  where wt.work_tag_public_id = p_work_tag_public_id
  for update;

  if not found then
    raise exception 'WORK_TAG_NOT_FOUND' using errcode='P0001';
  end if;

  if v_work_tag_status <> 'active' then
    raise exception 'WORK_TAG_REVOKED' using errcode='P0001';
  end if;

  -- 2) membership check
  select cm.company_member_id, cm.member_role, cm.member_status
    into v_member_id, v_member_role, v_member_status
  from company_member cm
  where cm.company_id = v_company_id
    and cm.user_id = p_auth_user_id
  limit 1;

  if not found then
    raise exception 'FORBIDDEN_NOT_MEMBER' using errcode='P0001';
  end if;

  if v_member_status <> 'active' then
    raise exception 'FORBIDDEN_NOT_MEMBER' using errcode='P0001';
  end if;

  -- MVP: employee only (adjust if needed)
  if v_member_role <> 'employee' then
    raise exception 'FORBIDDEN_ROLE' using errcode='P0001';
  end if;

  -- 3) find active on_duty_session (lock candidate row if exists)
  select ods.on_duty_session_id
    into v_active_session_id
  from on_duty_session ods
  where ods.company_member_id = v_member_id
    and ods.duty_status = 'active'
  limit 1;

  -- 4) decide action by intended_action + state
  if v_intended_action = 'clockin' then
    if v_active_session_id is not null then
      raise exception 'ALREADY_ON_DUTY' using errcode='P0001';
    end if;

    -- clockin
    insert into on_duty_session (
      on_duty_session_id,
      company_id,
      company_member_id,
      duty_status,
      started_at,
      ended_at,
      version,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_company_id,
      v_member_id,
      'active',
      v_now,
      null,
      1,
      now(),
      now()
    )
    returning on_duty_session.on_duty_session_id, on_duty_session.started_at
      into on_duty_session_id, started_at;

    action := 'clockin';
    company_id := v_company_id;
    ended_at := null;
    return;

  elsif v_intended_action = 'clockout' then
    if v_active_session_id is null then
      raise exception 'NOT_ON_DUTY' using errcode='P0001';
    end if;

    update on_duty_session
    set duty_status = 'ended',
        ended_at = v_now,
        version = version + 1,
        updated_at = now()
    where on_duty_session_id = v_active_session_id
    returning on_duty_session.on_duty_session_id, on_duty_session.ended_at
      into on_duty_session_id, ended_at;

    action := 'clockout';
    company_id := v_company_id;
    started_at := null;
    return;

  else
    -- auto
    if v_active_session_id is null then
      -- clockin
      insert into on_duty_session (
        on_duty_session_id,
        company_id,
        company_member_id,
        duty_status,
        started_at,
        ended_at,
        version,
        created_at,
        updated_at
      ) values (
        gen_random_uuid(),
        v_company_id,
        v_member_id,
        'active',
        v_now,
        null,
        1,
        now(),
        now()
      )
      returning on_duty_session.on_duty_session_id, on_duty_session.started_at
        into on_duty_session_id, started_at;

      action := 'clockin';
      company_id := v_company_id;
      ended_at := null;
      return;

    else
      -- clockout
      update on_duty_session
      set duty_status = 'ended',
          ended_at = v_now,
          version = version + 1,
          updated_at = now()
      where on_duty_session_id = v_active_session_id
      returning on_duty_session.on_duty_session_id, on_duty_session.ended_at
        into on_duty_session_id, ended_at;

      action := 'clockout';
      company_id := v_company_id;
      started_at := null;
      return;
    end if;
  end if;
end;
$$;
```

---

## 14. Edge Function（実装責務）

* `auth.getUser()` で `auth_user_id` を取得（401制御）
* 入力 `work_tag_public_id` を検証（400制御）
* service_role で RPC `employee_work_tap` を呼ぶ
* RPCの例外メッセージを error_code にマップしHTTP返却
* 成功時、`action` に応じたレスポンスを返す

---

## 15. クライアント（ネイティブ）実装メモ

### 15.1 NFCタップ→API呼び出し手順

1. NFCタグからURL取得
2. URLクエリ `t` を取得 → `work_tag_public_id`
3. `POST /employee-work-tap` を呼ぶ（BearerはSupabase session）
4. `action` を見てUI更新（出勤/退勤メッセージ）

### 15.2 UX推奨

* 連続タップ（数秒）をクライアント側でも抑止（無駄なAPIを減らす）
* 成功時はトースト＋軽いバイブ（任意）
* エラーは原因別に案内（別会社、既に出勤中、退勤対象なし等）

---

## 16. インデックス（推奨）

* `work_tag(work_tag_public_id)` unique（既にある想定）
* `company_member(company_id, user_id)`（所属判定）
* `on_duty_session(company_member_id) where duty_status='active'`（上記の部分ユニーク + 検索）
* `on_duty_session(company_id, duty_status, started_at desc)`（運用/分析用）

---

## 17. テスト観点（MVP）

正常系

* autoタグ + activeセッションなし → clockin（新規activeが1件）
* autoタグ + activeセッションあり → clockout（endedに更新）
* clockin専用タグ + activeなし → clockin
* clockout専用タグ + activeあり → clockout

異常系

* 別会社タグ（company_memberなし）→ 403
* revokedタグ → 409（WORK_TAG_REVOKED）
* clockin専用で既にactive → 409（ALREADY_ON_DUTY）
* clockout専用でactiveなし → 409（NOT_ON_DUTY）
* 二重タップ（同時実行）→ 片方成功、片方は部分ユニーク等で失敗（整合は崩れない）

---

## Open Items（必要なら次に詰める）

* `member_role` の許可範囲（employee限定か、staff/managerも含めるか）
* `started_work_tag_id / ended_work_tag_id` 等の追加カラムを入れるか（運用性の向上）
* `audit_log` をMVPで入れるか（推奨は入れる）
* intended_action をタグごとにどう運用するか（autoが基本、出入口で分けたいならclockin/clockout）

```
```
