# API: ops-affiliation-requests-decide

## 概要
アフィリエーションリクエストを承認または却下する。マネージャーのみ。楽観的ロックを使用。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-20781d19/ops-affiliation-requests-decide`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| access_token | string | ○ | Supabase Auth JWT |
| company_id | string (uuid) | ○ | 会社ID |
| company_member_request_id | string (uuid) | ○ | リクエストID |
| decision | string | ○ | "approve" または "reject" |
| review_note | string | - | レビューメモ |
| granted_role | string | - | employee, staff, manager（デフォルト: staff） |
| expected_version | number | ○ | 楽観的ロックバージョン |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| company_member_request_id | string | リクエストID |
| request_status | string | approved または rejected |
| reviewed_at | string | レビュー日時 |
| reviewed_by_company_member_id | string | レビュアーID |
| company_member_id | string \| null | 作成/更新されたメンバーID（承認時のみ） |
| version | number | 新しいバージョン |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| REQUEST_NOT_FOUND | 404 | リクエストが見つからない |
| VERSION_CONFLICT | 409 | expected_version の不一致 |
| ALREADY_DECIDED | 409 | リクエストが pending ではない |

## 処理説明

1. 認証し、マネージャーであることを確認する。
2. リクエストを取得し、会社とバージョンの一致を確認する。
3. decision=approve の場合：company_member を作成または再アクティブ化し、リクエストを approved に更新する。
4. decision=reject の場合：リクエストを rejected に更新する。
5. audit_log に記録する。
6. 結果を返す。
