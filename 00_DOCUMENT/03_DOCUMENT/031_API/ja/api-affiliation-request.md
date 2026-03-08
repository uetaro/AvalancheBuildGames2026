# API: affiliation-request

## 概要
アフィリエーション（会社メンバー）リクエストを作成する。スタッフ/従業員側。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-c253248c/affiliation-request`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |
| company_id | string (uuid) | ○ | 会社ID |
| request_note | string | - | リクエストメモ |
| job_title | string | - | 役職 |
| client_request_id | string | - | クライアントリクエストID |

## 出力（成功: 201）

| 項目 | 型 | 説明 |
|------|------|-------------|
| company_member_request_id | string | 作成されたリクエストID |
| request_status | string | pending |
| requested_role | string | employee |
| job_title | string \| null | 役職 |
| created_at | string | 作成タイムスタンプ |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| COMPANY_NOT_FOUND | 404 | 会社が見つからない |
| COMPANY_SUSPENDED | 423 | 会社が非アクティブ |
| ALREADY_MEMBER | 409 | ユーザーは既にメンバー |
| REQUEST_ALREADY_PENDING | 409 | 保留中のリクエストが存在 |

## 処理説明

1. 認証し、user_id を取得する。
2. 会社が存在しアクティブであることを検証する。
3. 既にメンバーでないことを確認する。
4. 同一会社に対する保留中のリクエストがないことを確認する。
5. company_member_request を挿入（request_status=pending, requested_role=employee）。
6. 作成されたレコードを返す。
