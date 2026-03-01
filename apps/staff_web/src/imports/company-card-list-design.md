````md id="x8a1k0"
# Heartel 詳細設計書（MVP）
# カード一覧取得（W-05 / Company Web）※Supabase Auth 前提

- ドキュメントID: DD-OPS-CARD-LIST
- 版数: v1.0
- 対象: MVP
- 作成日: 2026-02-28
- 対象画面: W-05 カード管理（staff/manager）
- 目的: カードの状態・割当状況を一覧で取得し、運用（割当/変更）の前提情報を提供する

---

## 1. 概要

### 1.1 目的
Company Web のカード管理画面で、対象会社（company_id）のカード一覧を取得する。  
カードの状態（issued/active/revoked）と、現行の部屋割当（room_id / room_code）を表示できること。

### 1.2 MVPの完了条件
- 権限（staff/manager, active所属）を満たすユーザーがカード一覧を取得できる
- revokedカードは一覧に出してもよい（運用上見たい）※UIのデフォルトは active/issued のみでも可
- 現行割当（card_room_binding の unbound_at is null）を同時に取得し表示できる

---

## 2. スコープ

### 2.1 対象ロール
- staff / manager（Company Web）
  - `company_member.member_role in ('staff','manager')`
  - `company_member.member_status='active'`

### 2.2 対象外（MVP）
- 高度な検索（全文検索/複雑な条件）
- 大量データ向けの最適化（ただしページングは必須）

---

## 3. I/F設計（Edge Function）

### 3.1 Endpoint
- Method: `GET`
- Path: `/functions/v1/ops-cards`

### 3.2 Headers
- `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`

### 3.3 Query Parameters（入力）
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| company_id | uuid | YES | 対象会社 |
| status | text | NO | `issued/active/revoked` のいずれか。複数はカンマ区切り可（例: `issued,active`） |
| room_id | uuid | NO | 特定部屋のカードに絞る |
| limit | integer | NO | 1ページ件数（default 50, max 200） |
| cursor | timestamptz | NO | ページング用（`created_at` 基準） |

例:
- `/ops-cards?company_id=...&status=issued,active&limit=50`
- `/ops-cards?company_id=...&cursor=2026-02-28T00:00:00Z&limit=50`

### 3.4 Response（出力）
| 項目 | 型 | 説明 |
|---|---|---|
| items | array | カード一覧 |
| next_cursor | timestamptz/null | 次ページ取得用。末尾ならnull |

items要素:
| 項目 | 型 | 説明 |
|---|---|---|
| card_id | uuid | カードID |
| card_uid | text | カードUID |
| card_status | text | `issued/active/revoked` |
| issued_at | timestamptz | 発行日時 |
| revoked_at | timestamptz/null | 失効日時 |
| current_room | object/null | 現行割当（なければnull） |
| created_at | timestamptz | 作成日時 |

current_room:
- `room_id`, `room_code`, `room_label`

出力例:
```json
{
  "items": [
    {
      "card_id": "c5b2a1a9-4b5b-4f5e-9d08-d3c7f7e1a5d0",
      "card_uid": "NFC-ABC-001",
      "card_status": "active",
      "issued_at": "2026-02-01T00:00:00Z",
      "revoked_at": null,
      "current_room": {
        "room_id": "c5a1f7f2-6c40-43d2-b3e8-0c8a8c75c1aa",
        "room_code": "1103",
        "room_label": "1103"
      },
      "created_at": "2026-02-01T00:00:00Z"
    }
  ],
  "next_cursor": null
}
````

---

## 4. 認証・認可

### 4.1 認証

* Edge Function で `auth.getUser()` により Supabase Auth トークンを検証
* 失敗時 401

### 4.2 認可

* `company_member` を検索し、以下を満たすこと

  * `company_id = query.company_id`
  * `user_id = auth_user_id`
  * `member_role in ('staff','manager')`
  * `member_status='active'`
* 満たさない場合 403

---

## 5. 取得ロジック（データ）

### 5.1 参照テーブル

* `card`
* `card_room_binding`（現行割当）
* `room`（現行割当の部屋情報）

### 5.2 SQLの考え方（概略）

* `card` を company_id で絞る
* 現行割当は `card_room_binding` から `unbound_at is null` の1件を LEFT JOIN
* `room` を JOIN して `room_code` を取る
* ページングは `created_at`（または `card_id`）で安定化

---

## 6. RPC設計（推奨 / 任意）

一覧取得は単純な SELECT なので、MVPは Edge Function 内のクエリでも良い。
ただし JOIN + ページングの再利用性が高いので RPC化も可。

### 6.1 RPC名（任意）

* `ops_list_cards`

### 6.2 引数（案）

* `p_company_id uuid`
* `p_statuses text[] null`
* `p_room_id uuid null`
* `p_limit int default 50`
* `p_cursor timestamptz null`

### 6.3 戻り値（案）

* `card_id, card_uid, card_status, issued_at, revoked_at, room_id, room_code, room_label, created_at`

---

## 7. エラー設計

| HTTP | error_code       | 条件                             |
| ---- | ---------------- | ------------------------------ |
| 401  | UNAUTHORIZED     | トークン不正                         |
| 403  | FORBIDDEN        | 所属/権限なし                        |
| 400  | VALIDATION_ERROR | company_id欠落、status不正、limit範囲外 |
| 500  | INTERNAL_ERROR   | 予期しない例外                        |

---

## 8. インデックス（推奨）

* `card(company_id, created_at desc)`
* `card(company_id, card_status, created_at desc)`
* `card_room_binding(card_id) where unbound_at is null`
* `room(company_id, room_code)`（既にある前提）

---

## 9. テスト観点（MVP）

* staffが company_id 指定で一覧取得できる
* employeeが取得しようとすると403
* statusフィルタが効く（issuedのみ等）
* 現行割当があるカードは current_room が埋まる
* 現行割当がないカードは current_room=null

---

````

```md id="o2m7r4"
# Heartel 詳細設計書（MVP）
# ルーム一覧取得（W-02/W-01の入力候補 / Company Web）※Supabase Auth 前提

- ドキュメントID: DD-OPS-ROOM-LIST
- 版数: v1.0
- 対象: MVP
- 作成日: 2026-02-28
- 対象画面: W-01 滞在一覧・運用 / W-02 チェックイン（部屋選択候補）
- 目的: 対象会社の部屋マスタ一覧を取得し、チェックイン等の候補に利用する

---

## 1. 概要

### 1.1 目的
Company Web が対象会社（company_id）の `room` を一覧取得し、チェックインの部屋選択・滞在検索のフィルタ等に利用できるようにする。

### 1.2 MVPの完了条件
- staff/manager が room 一覧を取得できる
- `is_active=false` を含める/除外するを選べる（デフォルト除外でも可）
- 大量件数に備えページングができる（ただし通常は部屋数は少ない想定）

---

## 2. スコープ

### 2.1 対象ロール
- staff / manager
  - `company_member.member_role in ('staff','manager')`
  - `company_member.member_status='active'`

### 2.2 対象外（MVP）
- 部屋の新規作成/更新（別設計書）
- 予約台帳との統合

---

## 3. I/F設計（Edge Function）

### 3.1 Endpoint
- Method: `GET`
- Path: `/functions/v1/ops-rooms`

### 3.2 Headers
- `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`

### 3.3 Query Parameters（入力）
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| company_id | uuid | YES | 対象会社 |
| include_inactive | boolean | NO | trueならinactiveも含む（default false） |
| limit | integer | NO | default 200（部屋は少数想定） |
| cursor | text | NO | ページング用（room_codeの末尾等） |

例:
- `/ops-rooms?company_id=...`
- `/ops-rooms?company_id=...&include_inactive=true`

### 3.4 Response（出力）
| 項目 | 型 | 説明 |
|---|---|---|
| items | array | ルーム一覧 |
| next_cursor | text/null | 次ページ用 |

items要素:
| 項目 | 型 | 説明 |
|---|---|---|
| room_id | uuid | 部屋ID |
| room_code | text | 部屋コード |
| room_label | text/null | 表示ラベル |
| is_active | boolean | 有効フラグ |
| created_at | timestamptz | 作成日時 |

出力例:
```json
{
  "items": [
    {
      "room_id": "c5a1f7f2-6c40-43d2-b3e8-0c8a8c75c1aa",
      "room_code": "1103",
      "room_label": "1103",
      "is_active": true,
      "created_at": "2026-02-01T00:00:00Z"
    }
  ],
  "next_cursor": null
}
````

---

## 4. 認証・認可

### 4.1 認証

* `auth.getUser()` でトークン検証
* 失敗時 401

### 4.2 認可

* `company_member` を検索して以下を満たすこと

  * `company_id = query.company_id`
  * `user_id = auth_user_id`
  * `member_role in ('staff','manager')`
  * `member_status='active'`
* 満たさない場合 403

---

## 5. 取得ロジック

### 5.1 参照テーブル

* `room`

### 5.2 フィルタ条件

* `room.company_id = company_id`
* `include_inactive=false` の場合 `is_active=true`

### 5.3 ソート

* `room_code` 昇順（運用で直感的）
* もしくは `created_at` 降順（実装都合）
  ※MVPは `room_code asc` 推奨

---

## 6. RPC設計（任意）

roomは基本マスタで件数も少ないため、Edge Function 直SQLでもよい。
再利用性を高めるなら RPC化。

* `ops_list_rooms(p_company_id uuid, p_include_inactive boolean, p_limit int, p_cursor text)`

---

## 7. エラー設計

| HTTP | error_code       | 条件                   |
| ---- | ---------------- | -------------------- |
| 401  | UNAUTHORIZED     | トークン不正               |
| 403  | FORBIDDEN        | 所属/権限なし              |
| 400  | VALIDATION_ERROR | company_id欠落、limit不正 |
| 500  | INTERNAL_ERROR   | 予期しない例外              |

---

## 8. インデックス（推奨）

* `room(company_id, room_code)`
* `room(company_id, is_active, room_code)`

---

## 9. テスト観点（MVP）

* staffが company_id 指定で room 一覧取得できる
* employeeが取得しようとすると403
* include_inactive=falseでinactiveが除外される
* include_inactive=trueでinactiveも返る
* room_code昇順で返る

---

```
```
