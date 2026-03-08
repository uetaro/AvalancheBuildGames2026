# Staff Mobile: Kudos Detail

## Screen Overview
Display single Kudos detail (message, category, points, chain proof).

## Path
`/app/kudos/:id`

## Display Items

| Item | Description |
|------|------|
| kudos_status | pending, confirmed, rejected |
| category | Category |
| message_text | Full text |
| points_awarded | Points |
| created_at, confirmed_at | Datetime |
| company_name | Company name |
| proof | receipt_status, tx_hash, anchor_hash, created_at |

## Actions

| Action | Behavior |
|------|------|
| Back | To /app/kudos or /app/kudos/list |

## API
- GET my-kudos/:id

## Navigation
- /app/kudos — Back
