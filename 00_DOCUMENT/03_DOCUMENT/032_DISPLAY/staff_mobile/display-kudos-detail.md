# スタッフモバイル: Kudos 詳細

## 画面概要
単一 Kudos の詳細（メッセージ、カテゴリ、ポイント、chain proof）を表示する。

## パス
`/app/kudos/:id`

## 表示項目

| 項目 | 説明 |
|------|------|
| kudos_status | pending, confirmed, rejected |
| category | カテゴリ |
| message_text | 全文 |
| points_awarded | ポイント |
| created_at, confirmed_at | 日時 |
| company_name | 会社名 |
| proof | receipt_status, tx_hash, anchor_hash, created_at |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| 戻る | /app/kudos または /app/kudos/list へ |

## API
- GET my-kudos/:id

## 遷移先
- /app/kudos — 戻る
