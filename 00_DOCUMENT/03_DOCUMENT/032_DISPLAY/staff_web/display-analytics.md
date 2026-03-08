# スタッフWeb: Analytics（分析）

## 画面概要
マネージャー向け。Kudos・滞在の集計、トレンド、カテゴリ別内訳、メンバー別分析を表示する。

## パス
`/manager/analytics`

## 表示項目

| 項目 | 説明 |
|------|------|
| 期間 | days（デフォルト 30） |
| 会社サマリ | total_kudos, total_points, total_stays, completed_stays, active_stays, avg_kudos_per_day |
| トレンド | kudos_trend, stays_trend |
| カテゴリ内訳 | category_breakdown, category_scores |
| 最近の Kudos | recent_kudos |
| メンバー別 | total_kudos, total_points, kudos_trend, category_breakdown, week_growth, recent_kudos |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| 期間変更 | days を変更して再取得 |

## API
- POST ops-analytics
