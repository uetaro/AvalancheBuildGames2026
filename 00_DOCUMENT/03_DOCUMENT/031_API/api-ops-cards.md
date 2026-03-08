# API: ops-cards

## Overview
Returns available cards (excluding those with active stays). Used for check-in card selection.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-20781d19/ops-cards`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| access_token | string | Yes | Supabase Auth JWT |
| company_id | string (uuid) | Yes | Company ID |
| status | string | No | Comma-separated status filter (default: "active,issued") |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| items | array | Available cards |
| items[].card_id | string | Card ID |
| items[].card_uid | string | Card UID |
| items[].card_status | string | Card status |
| items[].current_room | object \| null | Bound room (room_id, room_code, room_label) or null |

## Processing

1. Authenticate; verify staff/manager.
2. Fetch cards for company with status filter.
3. Exclude cards that have active stays.
4. Fetch current card_room_binding for each card.
5. Return items.
