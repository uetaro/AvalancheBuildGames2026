````md id="k8y4xg"
# Heartel 詳細設計書（MVP）
# Staff Mobile：スタッフ情報一覧取得 / スタッフ情報編集 ※Supabase Auth 前提

- 作成日: 2026-03-01
- Backend: Supabase（Auth + Postgres + Edge Functions + RPC）
- 対象クライアント: staff-mobile（従業員が使うネイティブアプリ）
- 前提スキーマ: `company_member` に staff情報（job_title, display_name_override, public_profile_json, visibility_scope, version）を保持

---

# A. スタッフ情報一覧取得（Staff List for Staff Mobile）

- ドキュメントID: DD-STAFFMOBILE-STAFF-LIST
- 版数: v1.0
- 目的: 自社（company）の所属スタッフ一覧を取得し、社内名簿/チーム表示/（任意）勤務中表示を行う

## 1. 概要

### 1.1 目的
ログイン済みユーザーが、自分の所属する会社（company）内のスタッフ一覧を取得する。  
一覧は「所属がactive」「ロールが employee/staff/manager」を対象とし、必要に応じて勤務中（on_duty_session active）も併記できる。

### 1.2 MVP完了条件
- Supabase Auth で認証されたユーザーが一覧取得できる
- 会社スコープはサーバ側で確定（IDOR防止）
- ページングができる
- 返却に `company_member_id` と `version` を含み、後続の編集（B）に利用できる

---

## 2. スコープ

### 2.1 対象ロール
- 取得者（閲覧者）：`company_member.member_status='active'` の所属者（employee/staff/manager）
- 一覧対象（被閲覧者）：`member_status='active'` かつ `member_role in ('employee','staff','manager')`

### 2.2 対象外（MVP）
- 全文検索、複雑な条件検索
- 会社横断の閲覧（グループ比較は別）
- 詳細プロフィールの全項目閲覧（公開範囲制御は後で拡張可能）

---

## 3. UI仕様（staff-mobile）

### 3.1 表示項目（MVP）
各スタッフ行に表示（最小）
- 表示名（display_name）
- 職種（job_title）
- ロール（member_role）※表示は任意
- 勤務中バッジ（任意、on_duty=true/false）
- 退職/終了は一覧に含めない（member_status=endedは除外）

### 3.2 フィルタ（任意）
- ロールフィルタ（employeeのみ等）
- 勤務中のみ（on_duty=trueのみ）

---

## 4. API（Edge Function）

### 4.1 Endpoint
- Method: `GET`
- Path: `/functions/v1/staff-mobile-staff-list`
- Auth: Supabase Auth（Bearer）

### 4.2 Headers
- `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`

### 4.3 Query Parameters
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| limit | int | NO | default 50, max 200 |
| cursor | timestamptz | NO | ページング（`updated_at` 基準推奨） |
| role | text | NO | `employee/staff/manager`（複数はカンマ区切り） |
| on_duty | boolean | NO | trueで勤務中のみ（MVPは任意） |
| q | text | NO | 表示名の部分一致（MVPは任意） |

※`company_id` は **受け取らない**（サーバで自分の所属から確定する）。

### 4.4 Response
```json
{
  "company_id": "10000000-0000-0000-0000-000000000001",
  "items": [
    {
      "company_member_id": "0f08a7b1-2a7c-4b23-8d11-8a9c11c1a111",
      "user_id": "3c2b0e77-1111-2222-3333-444455556666",
      "display_name": "Sato",
      "job_title": "Front Desk",
      "member_role": "employee",
      "on_duty": true,
      "on_duty_started_at": "2026-03-01T09:00:00+09:00",
      "version": 3,
      "updated_at": "2026-03-01T08:59:00+09:00"
    }
  ],
  "next_cursor": null
}
````

items要素（MVP）

| 項目                 | 型                | 説明                     |
| ------------------ | ---------------- | ---------------------- |
| company_member_id  | uuid             | スタッフ識別（編集や参照に使う）       |
| user_id            | uuid             | Supabase auth uid      |
| display_name       | text             | 会社内表示名（override優先）     |
| job_title          | text/null        | 職種                     |
| member_role        | text             | employee/staff/manager |
| on_duty            | boolean          | 勤務中（任意）                |
| on_duty_started_at | timestamptz/null | 勤務開始時刻（任意）             |
| version            | int              | 楽観ロック用                 |
| updated_at         | timestamptz      | カラム更新日時                |

---

## 5. 認証・認可

### 5.1 認証

* Edge Function 内で `auth.getUser()` を実行し `auth_user_id` を取得できること
* 失敗 → 401

### 5.2 会社スコープ確定（必須）

* `company_member` を `user_id=auth_user_id` かつ `member_status='active'` で検索
* MVPは「1ユーザー=1社所属」前提で `company_id` を1つ確定

  * 複数所属があり得る場合は、別途「選択中 company_id」をアプリに持たせ、サーバ側で突合する（本設計の範囲外）

### 5.3 認可（閲覧可否）

* 取得者が上記 `company_member` を満たすならOK（employeeでも閲覧可）
* もし「employeeは閲覧不可」にしたい場合は `member_role in ('staff','manager')` に変更

---

## 6. 取得ロジック（DB）

### 6.1 対象抽出

* `company_member.company_id = my_company_id`
* `company_member.member_status='active'`
* `company_member.member_role in ('employee','staff','manager')`
* （任意）`role` フィルタ
* （任意）`q` フィルタ（display_name部分一致）

### 6.2 表示名の解決

表示名 `display_name` は以下優先

1. `company_member.display_name_override`
2. `user.display_name`
3. fallback `"(No Name)"`

### 6.3 勤務中（on_duty）付与（任意）

* `on_duty_session` を `company_id=my_company_id AND duty_status='active'` で引き、`company_member_id` を集合で突合
* on_duty=true/false を付与

---

## 7. エラー設計

| HTTP | error_code       | 条件                             |
| ---- | ---------------- | ------------------------------ |
| 401  | UNAUTHORIZED     | token不正/期限切れ                   |
| 403  | FORBIDDEN        | 所属なし（activeがない）/（制限するならrole不正） |
| 400  | VALIDATION_ERROR | limit不正、role不正など               |
| 500  | INTERNAL_ERROR   | 予期しない例外                        |

---

## 8. 推奨インデックス

* `company_member(company_id, member_status, member_role)`
* `company_member(company_id, updated_at desc)`
* `on_duty_session(company_id, duty_status)`
* `user(user_id)`（PK）

---

## 9. テスト観点

* 自社所属のactiveメンバーのみ返る
* 他社のメンバーは返らない
* on_duty=trueが勤務中にのみ付く（任意機能）
* pagingが動く（limit/cursor）
* token無し/無効で401

---

# B. スタッフ情報編集（My Profile Edit for Staff Mobile）

* ドキュメントID: DD-STAFFMOBILE-STAFF-EDIT
* 版数: v1.0
* 目的: staff-mobile で「自分のスタッフ情報」を編集し、Guest/社内名簿に反映する（楽観ロック対応）

## 1. 概要

### 1.1 目的

ログイン済みユーザーが、自分の `company_member` レコードの一部（表示名・職種・公開プロフィール等）を更新できるようにする。

### 1.2 MVP完了条件

* 自分自身の `company_member` のみ更新できる（他人は不可）
* `version` による楽観ロックで上書き競合を防止できる
* 監査ログ（任意だが推奨）を残せる

---

## 2. スコープ

### 2.1 更新対象フィールド（MVP）

* `display_name_override`（会社内表示名）
* `job_title`
* `public_profile_json`（経歴/資格/言語など）
* `visibility_scope`（company/group/platform）

※ロール（member_role）や所属状態（member_status）は **manager運用** の領域として本APIでは更新不可（別API）

---

## 3. API（Edge Function）

### 3.1 Endpoint（自分用）

* Method: `PUT`
* Path: `/functions/v1/staff-mobile-my-profile`
* Auth: Supabase Auth（Bearer）

### 3.2 Headers

* `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`
* `Content-Type: application/json`

### 3.3 Request Body

| 項目                    | 型      | 必須  | 説明                       |
| --------------------- | ------ | --- | ------------------------ |
| expected_version      | int    | YES | 現在のversion（楽観ロック）        |
| display_name_override | text   | NO  | 会社内表示名                   |
| job_title             | text   | NO  | 職種                       |
| public_profile_json   | object | NO  | 公開プロフィール（json）           |
| visibility_scope      | text   | NO  | `company/group/platform` |
| client_request_id     | text   | NO  | 相関ID                     |

入力例:

```json
{
  "expected_version": 3,
  "display_name_override": "Sato",
  "job_title": "Front Desk",
  "public_profile_json": { "languages": ["ja","en"], "certs": ["Sommelier"] },
  "visibility_scope": "company",
  "client_request_id": "profile-20260301-0009"
}
```

### 3.4 Response

成功（200）

```json
{
  "company_member_id": "0f08a7b1-2a7c-4b23-8d11-8a9c11c1a111",
  "version": 4,
  "updated_at": "2026-03-01T10:10:00+09:00"
}
```

---

## 4. 認証・認可

### 4.1 認証

* `auth.getUser()` により `auth_user_id` を取得
* 失敗 → 401

### 4.2 認可（自分のみ）

* `company_member` を `user_id=auth_user_id AND member_status='active'` で1件特定（MVP: 1社前提）
* 更新対象はその `company_member_id` のみに限定
* クライアントから `company_member_id` を受け取らない（IDOR対策）

---

## 5. バリデーション

* `expected_version` 必須
* `visibility_scope` は `company/group/platform` のみ許可
* `display_name_override` は長さ制限（例：1〜50）
* `job_title` は長さ制限（例：0〜50）
* `public_profile_json` は許可キー制限を設けるならここで（MVPは自由でも可）

---

## 6. DB更新方式（RPC推奨）

### 6.1 RPC名

* `staff_mobile_update_my_company_member`

### 6.2 引数

* `p_company_member_id uuid`
* `p_expected_version int`
* `p_display_name_override text null`
* `p_job_title text null`
* `p_public_profile_json jsonb null`
* `p_visibility_scope text null`

### 6.3 戻り値

* `company_member_id uuid`
* `version int`
* `updated_at timestamptz`

### 6.4 楽観ロック（必須）

* `update ... where company_member_id=? and version=?`
* 更新成功時 `version=version+1, updated_at=now()`
* 0件更新なら 409（VERSION_CONFLICT）

---

## 7. エラー設計

| HTTP | error_code       | 条件                     |
| ---- | ---------------- | ---------------------- |
| 401  | UNAUTHORIZED     | token不正                |
| 403  | FORBIDDEN        | 所属なし/activeでない         |
| 400  | VALIDATION_ERROR | expected_version欠落、値不正 |
| 409  | VERSION_CONFLICT | version不一致（上書き競合）      |
| 500  | INTERNAL_ERROR   | 予期しない例外                |

---

## 8. 監査ログ（推奨）

* `action='STAFF_PROFILE_UPDATE'`
* `target_table='company_member'`
* `target_id=company_member_id`
* `actor_user_id=auth_user_id`
* `detail_json` に変更内容（PIIは入れない、もしくはキーのみ）

---

## 9. RPC SQL雛形（MVP）

```sql
create or replace function staff_mobile_update_my_company_member(
  p_company_member_id uuid,
  p_expected_version int,
  p_display_name_override text default null,
  p_job_title text default null,
  p_public_profile_json jsonb default null,
  p_visibility_scope text default null
)
returns table (
  company_member_id uuid,
  version int,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update company_member
  set
    display_name_override = coalesce(p_display_name_override, display_name_override),
    job_title = coalesce(p_job_title, job_title),
    public_profile_json = coalesce(p_public_profile_json, public_profile_json),
    visibility_scope = coalesce(p_visibility_scope, visibility_scope),
    version = version + 1,
    updated_at = now()
  where company_member_id = p_company_member_id
    and version = p_expected_version;

  if not found then
    raise exception 'VERSION_CONFLICT' using errcode='P0001';
  end if;

  return query
  select cm.company_member_id, cm.version, cm.updated_at
  from company_member cm
  where cm.company_member_id = p_company_member_id;
end;
$$;
```

---

## 10. テスト観点

* 正常：expected_version一致 → 更新されversionが+1
* 異常：expected_version不一致 → 409（VERSION_CONFLICT）
* 異常：他人のcompany_member_idを指定できない（そもそも受け取らない設計）
* 異常：visibility_scope不正 → 400
* token無し/無効 → 401

---

```
```
