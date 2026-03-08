# Staff Web: Analytics

## Screen Overview
For managers. Display Kudos and stay aggregates, trends, category breakdown, member analysis.

## Path
`/manager/analytics`

## Display Items

| Item | Description |
|------|------|
| Period | days (default 30) |
| Company summary | total_kudos, total_points, total_stays, completed_stays, active_stays, avg_kudos_per_day |
| Trends | kudos_trend, stays_trend |
| Category breakdown | category_breakdown, category_scores |
| Recent Kudos | recent_kudos |
| By member | total_kudos, total_points, kudos_trend, category_breakdown, week_growth, recent_kudos |

## Actions

| Action | Behavior |
|------|------|
| Period change | Change days and re-fetch |

## API
- POST ops-analytics
