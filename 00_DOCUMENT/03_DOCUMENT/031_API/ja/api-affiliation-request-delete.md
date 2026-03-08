# API: affiliation-request (DELETE)

## 概要
保留中のアフィリエーションリクエストをキャンセルする。

## エンドポイント
- **メソッド:** DELETE
- **パス:** `/api/make-server-c253248c/affiliation-request/:id`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |
| id | path | ○ | company_member_request_id |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| success | boolean | true |
| request_status | string | cancelled |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| NOT_FOUND | 404 | リクエストが見つからない |
| FORBIDDEN | 403 | ユーザーのリクエストではない |
| INVALID_STATUS | 409 | キャンセルできるのは pending のリクエストのみ |

## 処理説明

1. 認証し、user_id を取得する。
2. id でリクエストを取得する。
3. user_id が一致し、request_status=pending であることを確認する。
4. request_status を cancelled に更新する。
5. success を返す。
