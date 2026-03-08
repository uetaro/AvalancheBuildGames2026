# API: work-status

## 概要
認証済みユーザーの現在の勤務（勤務中）ステータスを取得する。

## エンドポイント
- **メソッド:** GET
- **パス:** `/api/make-server-c253248c/work-status`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| on_duty | boolean | 勤務中かどうか |
| session | object \| null | アクティブセッション（on_duty_session_id, company_id, started_at, duty_status）または null |
| member | object \| null | company_member_id, company_id または null |

## 処理説明

1. 認証し、user_id を取得する。
2. ユーザーのアクティブな company_member を取得する。
3. メンバーのアクティブな on_duty_session を取得する。
4. on_duty、session、member を返す。
