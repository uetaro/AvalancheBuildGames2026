# Staff Mobile: Kudos List

## Screen Overview
Display list of received Kudos. Status/date filters, pagination supported.

## Path
`/app/kudos/list`

## Display Items

| Item | Description |
|------|------|
| Filter | status, from, to, limit, cursor |
| List | kudos_id, category, message_preview, points_awarded, created_at, company_name |
| summary | pending, confirmed, rejected counts |
| next_cursor | Next page |

## Actions

| Action | Behavior |
|------|------|
| Row tap | To /app/kudos/:id |
| Filter change | Re-fetch |

## API
- GET my-kudos

## Navigation
- /app/kudos/:id — Detail
