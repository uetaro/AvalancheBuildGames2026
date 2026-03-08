# API: my-kudos-stats

## 概要
スタッフ向けダッシュボード集計データ：Kudos合計、月次トレンド、カテゴリ別内訳、ホテル内ランキング。

## エンドポイント
- **メソッド:** GET
- **パス:** `/api/make-server-c253248c/my-kudos-stats`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| total | number | Kudos合計件数 |
| this_month | number | 今月の件数 |
| last_month | number | 先月の件数 |
| best_month | object | { count, month_label } |
| hotel_rank | number | 会社内でのユーザーランク |
| hotel_total | number | スタッフ合計数 |
| monthly_trend | array | [{ month, total, by_category }] |
| category_totals | array | [{ category, count, percentage, prev_month_count }] |
| hotel_category_distribution | object | { category: percentage } |

## 処理説明

1. 認証し、アクティブな company_member を取得する。
2. this_month, last_month, six_months_ago を計算する。
3. メンバーの kudos をクエリし、月・カテゴリで集計する。
4. ランキングのため会社の kudos をクエリする。
5. monthly_trend, category_totals, hotel_rank を構築する。
6. 集計統計を返す。
