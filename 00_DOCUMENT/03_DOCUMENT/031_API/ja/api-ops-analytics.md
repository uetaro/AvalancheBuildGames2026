# API: ops-analytics

## 概要
会社全体およびメンバー別の集計分析。Kudos、滞在、トレンド、カテゴリ別内訳。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-20781d19/ops-analytics`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| access_token | string | ○ | Supabase Auth JWT |
| company_id | string (uuid) | ○ | 会社ID |
| days | number | - | 期間（日数）（デフォルト: 30） |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| period_days | number | 期間日数 |
| since | string | 開始日 ISO |
| company | object | total_kudos, total_points, total_stays, completed_stays, active_stays, avg_kudos_per_day, kudos_trend, stays_trend, category_breakdown, category_scores, recent_kudos |
| members | array | メンバー別: company_member_id, display_name, total_kudos, total_points, kudos_trend, category_breakdown, category_scores, week_growth, recent_kudos 等 |

## 処理説明

1. 認証し、会社のスタッフ/マネージャーであることを確認する。
2. 期間内の会社の kudos、stays、members を取得する。
3. 会社レベルで集計：合計、日次トレンド、カテゴリ別内訳。
4. メンバー別：Kudos件数、ポイント、トレンド、カテゴリスコア、週次成長率。
5. company + members を返す。
