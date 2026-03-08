# API: my-kudos-stats

## Overview
Dashboard aggregate data for staff: total Kudos, monthly trend, category breakdown, hotel ranking.

## Endpoint
- **Method:** GET
- **Path:** `/api/make-server-c253248c/my-kudos-stats`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| total | number | Total Kudos count |
| this_month | number | This month count |
| last_month | number | Last month count |
| best_month | object | { count, month_label } |
| hotel_rank | number | User's rank in company |
| hotel_total | number | Total staff count |
| monthly_trend | array | [{ month, total, by_category }] |
| category_totals | array | [{ category, count, percentage, prev_month_count }] |
| hotel_category_distribution | object | { category: percentage } |

## Processing

1. Authenticate; get active company_member.
2. Compute this_month, last_month, six_months_ago.
3. Query kudos for member; aggregate by month, category.
4. Query company kudos for ranking.
5. Build monthly_trend, category_totals, hotel_rank.
6. Return aggregated stats.
