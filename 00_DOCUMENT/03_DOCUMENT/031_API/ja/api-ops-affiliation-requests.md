# API: ops-affiliation-requests

## 概要
会社のアフィリエーション（会社メンバー）リクエスト一覧を返す。マネージャーのみ。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-20781d19/ops-affiliation-requests`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| access_token | string | ○ | Supabase Auth JWT |
| company_id | string (uuid) | ○ | 会社ID |
| status | string | - | カンマ区切り: pending, approved, rejected, cancelled（デフォルト: pending） |
| limit | number | - | ページサイズ（1–200、デフォルト: 50） |
| cursor | string | - | ページネーションカーソル（created_at） |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| items | array | リクエストリスト |
| items[].company_member_request_id | string | リクエストID |
| items[].user_id | string | ユーザーID |
| items[].app_display_name | string | ユーザー表示名 |
| items[].email | string \| null | ユーザーメールアドレス |
| items[].requested_role | string | リクエストされたロール |
| items[].request_status | string | pending, approved, rejected, cancelled |
| items[].request_note | string \| null | リクエストメモ |
| items[].job_title | string \| null | 役職 |
| items[].review_note | string \| null | レビューメモ |
| items[].reviewed_at | string \| null | レビュー日時 |
| items[].created_at | string | 作成タイムスタンプ |
| next_cursor | string \| null | 次ページカーソル |

## 処理説明

1. 認証し、呼び出し元が会社のマネージャーであることを確認する。
2. ステータスフィルターをパースする（デフォルト: pending）。
3. ステータスフィルター付きで会社の company_member_request をクエリする。
4. 表示名・メールのため user テーブルと結合する。
5. ページネーション付きで items を返す。
