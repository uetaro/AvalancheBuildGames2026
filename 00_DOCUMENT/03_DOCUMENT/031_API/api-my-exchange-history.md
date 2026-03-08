# API: my-exchange-history

## Overview
Point exchange history for the current staff member.

## Endpoint
- **Method:** GET
- **Path:** `/api/make-server-c253248c/my-exchange-history`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |
| limit | query | No | Page size (1–100, default: 50) |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| items | array | Exchange list |
| items[].exchange_id | string | Exchange ID |
| items[].gift_name | string | Gift name |
| items[].points_used | number | Points used |
| items[].status | string | Status |
| items[].created_at | string | Created timestamp |
| items[].completed_at | string \| null | Completed timestamp |
| total_used | number | Total points used |

## Processing

1. Authenticate; get active company_member.
2. Query point_exchange for member.
3. Order by created_at desc, limit.
4. Sum points_used; return items, total_used.
