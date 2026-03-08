# API: chain-worker-submit

## Overview
Process queued/failed chain_receipt records. Sends to Avalanche C-Chain ReceiptRegistry.recordReceipt(). Called by pg_cron.

## Endpoint
- **Method:** POST
- **Path:** `/api/chain-worker-submit`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer SUPABASE_SERVICE_ROLE_KEY or CHAIN_WORKER_SECRET |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| processed | number | Records processed |
| submitted | number | Successfully submitted/confirmed |
| failed | number | Failed (retry scheduled) |

## Processing

1. Authorize via Bearer (service role or worker secret).
2. Fetch up to 5 chain_receipt where receipt_status in (queued, failed) and next_attempt_at <= now.
3. For each: check isRecorded(anchor_hash); if already recorded → mark confirmed.
4. Else: call recordReceipt(anchor_hash, points); update to submitted, set tx_hash.
5. On error: update to failed, set next_attempt_at (exponential backoff).
6. Return processed, submitted, failed.
