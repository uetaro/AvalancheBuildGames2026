# API: ops-checkout

## 概要
チェックアウトAPI。アクティブな滞在をクローズし、オプションで保留中のKudosを確認/却下する。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-20781d19/ops-checkout`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| access_token | string | ○ | Supabase Auth JWT |
| company_id | string (uuid) | ○ | 会社ID |
| stay_id | string (uuid) | ○ | クローズする滞在ID |
| checkout_at | string (ISO8601) | - | チェックアウト時刻（デフォルト: 現在） |
| kudos_decisions | array | - | [{ kudos_id, decision: "confirm" \| "reject" }] |
| client_request_id | string | - | トレース用クライアントリクエストID |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| stay_id | string | クローズされた滞在ID |
| checkout_at | string | チェックアウトタイムスタンプ |
| kudos_updated | number | 確認/却下されたKudos数 |
| queued_receipt_count | number | キューされたチェーン領収書数（参考） |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| UNAUTHORIZED | 401 | トークン無効または欠落 |
| VALIDATION_ERROR | 400 | stay_id欠落、滞在が見つからない |
| CONFLICT | 409 | 滞在は既にクローズ済み |

## 処理説明

1. 認証し、呼び出し元が会社のスタッフ/マネージャーであることを確認する。
2. 滞在を取得し、会社に属し stay_status=active であることを確認する。
3. 滞在を更新：stay_status=closed、checkout_at。
4. 各 kudos_decisions について：kudos_status を confirmed または rejected に更新する。
5. chain_receipt はKudos送信時に作成される；チェックアウトでは作成しない。
6. stay_id、checkout_at、kudos_updated を返す。
