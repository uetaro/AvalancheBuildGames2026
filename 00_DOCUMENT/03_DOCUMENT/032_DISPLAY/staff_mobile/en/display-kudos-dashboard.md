# Staff Mobile: Kudos Dashboard

## Screen Overview
Display received Kudos stats, monthly trend, category breakdown, recent Kudos, and AI career consultation.

## Path
`/app/kudos`

## Display Items

| Item | Description |
|------|------|
| Stats | total, this_month, last_month, best_month, hotel_rank |
| Monthly trend | Kudos count for past 6 months |
| Category breakdown | category_totals, radar chart |
| Hotel category distribution | hotel_category_distribution |
| Recent Kudos | Carousel format |
| AI career consultation | Chat UI (career-chat API) |
| Quick prompts | Common questions |

## Actions

| Action | Behavior |
|------|------|
| Recent Kudos tap | To /app/kudos/:id |
| View All | To /app/kudos/list |
| AI chat send | career-chat API |
| View toggle | radar / detail, category / trend |

## API
- GET my-kudos-stats
- GET my-kudos?limit=5
- POST career-chat

## Navigation
- /app/kudos/list — List
- /app/kudos/:id — Detail
