# API: ops-cards-all

## Overview
Returns all cards for a company (including those with active stays).

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-20781d19/ops-cards-all`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| access_token | string | Yes | Supabase Auth JWT |
| company_id | string (uuid) | Yes | Company ID |
| status | string | No | Comma-separated status filter (default: "active,issued") |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| items | array | All cards |
| items[].card_id | string | Card ID |
| items[].card_uid | string | Card UID |
| items[].card_status | string | Card status |
| items[].current_room | object \| null | Bound room or null |
| items[].active_stay | object \| null | Active stay (stay_id, checkin_at) or null |

## Processing

1. Authenticate; verify staff/manager.
2. Fetch all cards for company.
3. Fetch bindings and active stays.
4. Merge and return items.
