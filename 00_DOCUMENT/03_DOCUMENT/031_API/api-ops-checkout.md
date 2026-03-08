# API: ops-checkout

## Overview
Check-out API. Closes an active stay and optionally confirms/rejects pending Kudos.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-20781d19/ops-checkout`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| access_token | string | Yes | Supabase Auth JWT |
| company_id | string (uuid) | Yes | Company ID |
| stay_id | string (uuid) | Yes | Stay ID to close |
| checkout_at | string (ISO8601) | No | Check-out time (default: now) |
| kudos_decisions | array | No | [{ kudos_id, decision: "confirm" \| "reject" }] |
| client_request_id | string | No | Client request ID for tracing |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| stay_id | string | Closed stay ID |
| checkout_at | string | Check-out timestamp |
| kudos_updated | number | Count of Kudos confirmed/rejected |
| queued_receipt_count | number | Chain receipts queued (reference) |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing token |
| VALIDATION_ERROR | 400 | Missing stay_id, stay not found |
| CONFLICT | 409 | Stay already closed |

## Processing

1. Authenticate; verify caller is staff/manager of company.
2. Fetch stay; verify it belongs to company and stay_status=active.
3. Update stay: stay_status=closed, checkout_at.
4. For each kudos_decisions item: update kudos_status to confirmed or rejected.
5. chain_receipt is created at Kudos send time; checkout does not create it.
6. Return stay_id, checkout_at, kudos_updated.
