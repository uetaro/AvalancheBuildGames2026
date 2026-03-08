# API: my-kudos/:id

## 概要
単一Kudosの詳細を取得する。チェーン証明（receipt_status, tx_hash, anchor_hash）を含む。

## エンドポイント
- **メソッド:** GET
- **パス:** `/api/make-server-c253248c/my-kudos/:id`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |
| id | path | ○ | kudos_id |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| kudos_id | string | Kudos ID |
| kudos_status | string | pending, confirmed, rejected |
| category | string | カテゴリ |
| message_text | string | メッセージ全文 |
| points_awarded | number | ポイント |
| created_at | string | 作成タイムスタンプ |
| confirmed_at | string \| null | 確認タイムスタンプ |
| stay_id | string | Stay ID |
| company_name | string \| null | 会社名 |
| proof | object \| null | { receipt_status, tx_hash, anchor_hash, created_at } または null |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| NOT_FOUND | 404 | Kudosが見つからない |
| FORBIDDEN | 403 | Kudosがユーザーに属していない |

## 処理説明

1. 認証し、アクティブな company_member を取得する。
2. id で kudos を取得し、receiver_company_member_id が一致することを確認する。
3. kudos の chain_receipt を取得する。
4. kudos + proof を返す。
