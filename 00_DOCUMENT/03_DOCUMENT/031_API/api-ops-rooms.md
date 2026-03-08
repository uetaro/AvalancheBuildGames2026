# API: ops-rooms

## Overview
Returns room list for a company with active stay information.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-20781d19/ops-rooms`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| access_token | string | Yes | Supabase Auth JWT |
| company_id | string (uuid) | Yes | Company ID |
| include_inactive | boolean | No | Include inactive rooms (default: false) |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| items | array | Room list |
| items[].room_id | string | Room ID |
| items[].room_code | string | Room code |
| items[].room_label | string | Room label |
| items[].is_active | boolean | Active flag |
| items[].created_at | string | Created timestamp |
| items[].active_stay | object \| null | Active stay info (stay_id, card_id, card_uid, checkin_at) or null |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| UNAUTHORIZED | 401 | Invalid token |
| FORBIDDEN | 403 | Not staff/manager of company |
| INTERNAL_ERROR | 500 | DB error |

## Processing

1. Authenticate; verify caller is staff/manager of company.
2. Fetch rooms for company (optionally filter is_active=true).
3. Fetch active stays for company.
4. Fetch card UIDs for stays.
5. Merge stay info into rooms; return items.
