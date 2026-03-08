# スタッフモバイル: Kudos ダッシュボード

## 画面概要
受け取った Kudos の統計、月次トレンド、カテゴリ別内訳、最近の Kudos、AI キャリア相談を表示する。

## パス
`/app/kudos`

## 表示項目

| 項目 | 説明 |
|------|------|
| 統計 | total, this_month, last_month, best_month, hotel_rank |
| 月次トレンド | 過去6ヶ月の Kudos 数 |
| カテゴリ別内訳 | category_totals, レーダーチャート |
| ホテル内カテゴリ分布 | hotel_category_distribution |
| 最近の Kudos | カルーセル形式 |
| AI キャリア相談 | チャット UI（career-chat API） |
| クイックプロンプト | よくある質問 |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| 最近 Kudos タップ | /app/kudos/:id へ |
| View All | /app/kudos/list へ |
| AI チャット送信 | career-chat API |
| 表示切替 | radar / detail, category / trend |

## API
- GET my-kudos-stats
- GET my-kudos?limit=5
- POST career-chat

## 遷移先
- /app/kudos/list — 一覧
- /app/kudos/:id — 詳細
