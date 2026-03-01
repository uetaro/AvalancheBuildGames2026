````md id="b9xq1p"
# Heartel 詳細設計書（MVP）
# Staff Mobile：Kudos一覧取得（E-K-02 / Kudos List）※Supabase Auth 前提

- ドキュメントID: DD-STAFFMOBILE-KUDOS-LIST
- 版数: v1.0
- 作成日: 2026-03-01
- 対象画面: 従業員アプリ（staff_mobile）Kudosタブ → Kudos一覧（E-K-02）
- Backend: Supabase（Auth + Postgres + Edge Functions + RPC）
- 目的: ログイン中ユーザー（従業員）が「自分が受領したKudos」を一覧取得し、pending/confirmed/rejected の状態を表示する

---

## 1. 概要

### 1.1 目的
従業員アプリのKudos一覧画面で、ログイン中ユーザー（自分）に紐づく受領Kudosを一覧取得する。  
受領対象は `kudos.receiver_company_member_id = my_company_member_id` のものとする。

### 1.2 MVP完了条件
- Supabase Auth で認証されたユーザーが自分のKudos一覧を取得できる
- 会社スコープはサーバ側で確定（IDOR防止）
- pending/confirmed/rejected の状態を返す
- ページングできる
- （任意）期間フィルタ/ステータスフィルタができる（MVPでは status のみでも可）

---

## 2. スコープ

### 2.1 対象ロール
- `company_member.member_status='active'` のユーザー
- MVP推奨: `member_role='employee'` を主対象（staff/managerも受領対象なら拡張）

### 2.2 対象外（MVP）
- 会社/グループ横断の比較
- 高度な検索（全文検索、複雑な条件）
- 本文のポリシーマスク（MVPでは詳細画面側で対応でも良い）

---

## 3. データ設計（参照）

参照する主テーブル
- `kudos`
- `stay`（ホテル名などの表示に使う場合）
- `company`（滞在先ホテル名）
- `chain_receipt`（一覧に証跡ステータスを出すなら）
- `kudos_moderation`（一覧で表示するなら任意）

---

## 4. API設計（Edge Function）

### 4.1 Endpoint
- Method: `GET`
- Path: `/functions/v1/staff-mobile-kudos`
- Auth: Supabase Auth（Bearer）

### 4.2 Headers
- `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`

### 4.3 Query Parameters
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| status | text | NO | `pending/confirmed/rejected`（複数はカンマ区切り） |
| from | date | NO | 開始日（created_at基準） |
| to | date | NO | 終了日（created_at基準） |
| limit | int | NO | default 30, max 100 |
| cursor | timestamptz | NO | ページング（created_atの末尾） |
| include_proof | boolean | NO | trueで chain_receipt 情報を付与（MVP任意） |

※ `company_id` / `company_member_id` は **受け取らない**（サーバで自分を確定する）

例:
- `/staff-mobile-kudos?status=pending,confirmed&limit=30`
- `/staff-mobile-kudos?from=2026-02-01&to=2026-03-01&limit=30`
- `/staff-mobile-kudos?cursor=2026-03-01T00:00:00Z&limit=30`

### 4.4 Response（出力）
トップレベル
| 項目 | 型 | 説明 |
|---|---|---|
| items | array | Kudos一覧 |
| next_cursor | timestamptz/null | 次ページ用 |
| summary | object | 件数サマリ（任意） |

items要素（MVP最小）
| 項目 | 型 | 説明 |
|---|---|---|
| kudos_id | uuid | Kudos ID |
| kudos_status | text | pending/confirmed/rejected |
| category | text | カテゴリ |
| message_preview | text | 本文の先頭（例：50文字） |
| points_awarded | int | 付与ポイント |
| created_at | timestamptz | 作成日時 |
| confirmed_at | timestamptz/null | 確定日時 |
| stay_id | uuid | 滞在ID |
| company_name | text | ホテル名（表示用） |
| proof | object/null | 証跡（include_proof=true時） |

proof（任意）
- `receipt_status`（queued/submitted/confirmed/failed）
- `tx_hash`（null可）
- `anchor_hash`（null可）

出力例:
```json
{
  "items": [
    {
      "kudos_id": "5b1c1d1a-aaaa-bbbb-cccc-111122223333",
      "kudos_status": "pending",
      "category": "Hospitality",
      "message_preview": "Thank you for your amazing support!",
      "points_awarded": 100,
      "created_at": "2026-03-01T13:00:00+09:00",
      "confirmed_at": null,
      "stay_id": "4a2b7a9b-7b07-4a06-9c7c-9fb3c2f8a92d",
      "company_name": "Heartel Grand Hotel",
      "proof": null
    }
  ],
  "next_cursor": null,
  "summary": {
    "pending": 1,
    "confirmed": 10,
    "rejected": 0
  }
}
````

---

## 5. 認証・認可

### 5.1 認証

* Edge Function 内で `auth.getUser()` を実行し `auth_user_id` を取得
* 失敗 → 401

### 5.2 自分の company_member_id の確定（必須）

* `company_member` を `user_id=auth_user_id AND member_status='active'` で特定
* MVPは「1ユーザー=1社所属」前提で `company_member_id` を1つ確定

  * 複数所属があり得るなら “選択中 company_id” を別途渡し、サーバで突合（本書範囲外）

### 5.3 認可

* 自分の `company_member_id` が確定できればOK
* もし employee のみ許可するなら `member_role='employee'` をチェックし、外れたら 403

---

## 6. 取得ロジック（DB）

### 6.1 抽出条件（必須）

* `kudos.receiver_company_member_id = my_company_member_id`

### 6.2 フィルタ（任意）

* statusフィルタ：`kudos_status IN (...)`
* 期間フィルタ：`created_at >= from` / `created_at < to+1day`
* ページング：`created_at < cursor`（降順ページング）

### 6.3 Join（表示用）

* `kudos.stay_id -> stay.company_id -> company.company_name` を付与

  * 会社名は `kudos.company_id` から直接 `company` join でも可（stay join不要）
* include_proof=true の場合

  * `chain_receipt` を left join（`chain_receipt.kudos_id = kudos.kudos_id`）

### 6.4 message_preview

* `left(kudos.message_text, 50)` 等で生成（UI側で切っても良い）
* 将来：本文マスク（`message_is_masked=true`）なら `"Hidden"` など固定文言にする

---

## 7. エラー設計

| HTTP | error_code       | 条件                    |
| ---- | ---------------- | --------------------- |
| 401  | UNAUTHORIZED     | token不正               |
| 403  | FORBIDDEN        | 所属なし /（制限するならrole不正）  |
| 400  | VALIDATION_ERROR | status不正、limit不正、日付不正 |
| 500  | INTERNAL_ERROR   | 予期しない例外               |

---

## 8. 推奨インデックス

* `kudos(receiver_company_member_id, created_at desc)`
* `kudos(receiver_company_member_id, kudos_status, created_at desc)`
* `company_member(user_id, member_status)`
* `company(company_id)`（PK）
* `chain_receipt(kudos_id)`（unique想定）

---

## 9. 実装方式（RPC任意）

一覧取得は SELECT + join なので Edge Function 直で実装しても良い。
再利用や最適化を見込むなら RPC化。

RPC案: `staff_mobile_list_kudos`

* 引数: `p_company_member_id uuid, p_statuses text[], p_from timestamptz, p_to timestamptz, p_limit int, p_cursor timestamptz, p_include_proof bool`
* 戻り: items相当

MVPでは「Edge Function直SQL」で十分。

---

## 10. テスト観点（MVP）

* 自分の受領Kudosのみ返る（他人のKudosが混ざらない）
* statusフィルタが効く
* created_at降順で返る
* cursorページングが動く
* include_proof=trueでproofが付く（存在しない場合null）
* token無し/無効で401
* 所属なしで403

---

```
```
