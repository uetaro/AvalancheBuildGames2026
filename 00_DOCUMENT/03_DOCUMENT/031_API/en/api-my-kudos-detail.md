# API: my-kudos/:id

## Overview
Get single Kudos detail including chain proof (receipt_status, tx_hash, anchor_hash).

## Endpoint
- **Method:** GET
- **Path:** `/api/make-server-c253248c/my-kudos/:id`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |
| id | path | Yes | kudos_id |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| kudos_id | string | Kudos ID |
| kudos_status | string | pending, confirmed, rejected |
| category | string | Category |
| message_text | string | Full message |
| points_awarded | number | Points |
| created_at | string | Created timestamp |
| confirmed_at | string \| null | Confirmed timestamp |
| stay_id | string | Stay ID |
| company_name | string \| null | Company name |
| proof | object \| null | { receipt_status, tx_hash, anchor_hash, created_at } or null |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| NOT_FOUND | 404 | Kudos not found |
| FORBIDDEN | 403 | Kudos does not belong to user |

## Processing

1. Authenticate; get active company_member.
2. Fetch kudos by id; verify receiver_company_member_id matches.
3. Fetch chain_receipt for kudos.
4. Return kudos + proof.
