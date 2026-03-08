# API: chain-worker-confirm

## Overview
Confirm submitted chain_receipt transactions. Checks eth_getTransactionReceipt; status=1 → confirmed, status=0 → failed+retry. Called by pg_cron.

## Endpoint
- **Method:** POST
- **Path:** `/api/chain-worker-confirm`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer SUPABASE_SERVICE_ROLE_KEY or CHAIN_WORKER_SECRET |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| processed | number | Records processed |
| confirmed | number | Tx confirmed |
| failed | number | Tx reverted (retry scheduled) |

## Processing

1. Authorize via Bearer.
2. Fetch up to 10 chain_receipt where receipt_status=submitted and tx_hash not null.
3. For each: getTransactionReceipt(tx_hash).
4. If pending: skip (next scan).
5. If status=1: update to confirmed, set confirmed_at.
6. If status=0: update to failed, set next_attempt_at (backoff).
7. Return processed, confirmed, failed.
