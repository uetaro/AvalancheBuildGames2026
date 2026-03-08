# API: work-tap

## 概要
NFC勤務タグタップで出勤/退勤する。on_duty_session を作成または終了する。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-c253248c/work-tap`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |
| work_tag_public_id | string | ○ | 勤務タグ公開ID |
| tapped_at | string (ISO8601) | - | タップ時刻（デフォルト: 現在） |
| client_request_id | string | - | クライアントリクエストID |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| action | string | clockin または clockout |
| company_id | string | 会社ID |
| on_duty_session_id | string | セッションID |
| started_at | string \| null | 開始時刻（出勤時） |
| ended_at | string \| null | 終了時刻（退勤時） |
| message | string | "出勤しました" または "退勤しました" |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| WORK_TAG_NOT_FOUND | 404 | タグが見つからない |
| WORK_TAG_REVOKED | 409 | タグ失効 |
| FORBIDDEN_NOT_MEMBER | 403 | 会社のメンバーではない |
| ALREADY_ON_DUTY | 409 | 既に出勤済み |
| NOT_ON_DUTY | 409 | 出勤していない（退勤時） |

## 処理説明

1. 認証し、user_id を取得する。
2. work_tag_public_id で work_tag を取得し、アクティブであることを確認する。
3. ユーザーがタグの会社のアクティブな company_member であることを確認する。
4. intended_action（clockin/clockout/auto）をチェックする。
5. auto の場合：アクティブセッションに基づいてトグルする。
6. clockin の場合：on_duty_session を作成し、action=clockin を返す。
7. clockout の場合：セッションの duty_status=ended に更新し、action=clockout を返す。
