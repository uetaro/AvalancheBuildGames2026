# API: my-affiliation-requests

## 概要
現在のユーザーのアフィリエーションリクエストを会社名付きで一覧表示する。

## エンドポイント
- **メソッド:** GET
- **パス:** `/api/make-server-c253248c/my-affiliation-requests`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| requests | array | リクエストリスト |
| requests[].company_member_request_id | string | リクエストID |
| requests[].company_id | string | 会社ID |
| requests[].company | object | { company_name } |
| requests[].request_status | string | pending, approved, rejected, cancelled |
| requests[].requested_role | string | リクエストされたロール |
| requests[].job_title | string \| null | 役職 |
| requests[].request_note | string \| null | リクエストメモ |
| requests[].review_note | string \| null | レビューメモ |
| requests[].created_at | string | 作成タイムスタンプ |
| requests[].updated_at | string | 更新タイムスタンプ |

## 処理説明

1. 認証し、user_id を取得する。
2. user_id の company_member_request をクエリする。
3. 会社名のため company と結合する。
4. created_at 降順でソートし、50件に制限する。
5. requests を返す。
