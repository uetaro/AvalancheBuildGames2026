# スタッフモバイル: Kudos 一覧

## 画面概要
受け取った Kudos の一覧を表示する。ステータス・日付フィルタ、ページネーション対応。

## パス
`/app/kudos/list`

## 表示項目

| 項目 | 説明 |
|------|------|
| フィルタ | status, from, to, limit, cursor |
| 一覧 | kudos_id, category, message_preview, points_awarded, created_at, company_name |
| summary | pending, confirmed, rejected 件数 |
| next_cursor | 次ページ |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| 行タップ | /app/kudos/:id へ |
| フィルタ変更 | 再取得 |

## API
- GET my-kudos

## 遷移先
- /app/kudos/:id — 詳細
