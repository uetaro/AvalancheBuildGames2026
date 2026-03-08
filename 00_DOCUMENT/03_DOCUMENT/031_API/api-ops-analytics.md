# API: ops-analytics

## Overview
Aggregated company and per-member analytics. Kudos, stays, trends, category breakdown.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-20781d19/ops-analytics`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| access_token | string | Yes | Supabase Auth JWT |
| company_id | string (uuid) | Yes | Company ID |
| days | number | No | Period in days (default: 30) |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| period_days | number | Period days |
| since | string | Start date ISO |
| company | object | total_kudos, total_points, total_stays, completed_stays, active_stays, avg_kudos_per_day, kudos_trend, stays_trend, category_breakdown, category_scores, recent_kudos |
| members | array | Per-member: company_member_id, display_name, total_kudos, total_points, kudos_trend, category_breakdown, category_scores, week_growth, recent_kudos, etc. |

## Processing

1. Authenticate; verify staff/manager of company.
2. Fetch kudos, stays, members for company in period.
3. Aggregate company-level: totals, daily trends, category breakdown.
4. Per-member: kudos count, points, trend, category scores, week-over-week growth.
5. Return company + members.
