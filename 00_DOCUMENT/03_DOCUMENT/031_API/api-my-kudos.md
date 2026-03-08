# API: my-kudos

## Overview
List Kudos received by the current staff member. Supports status filter, date range, pagination.

## Endpoint
- **Method:** GET
- **Path:** `/api/make-server-c253248c/my-kudos`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |
| status | query | No | Comma-separated: pending, confirmed, rejected |
| from | query | No | Start date (ISO8601) |
| to | query | No | End date (ISO8601) |
| limit | query | No | Page size (1–100, default: 30) |
| cursor | query | No | Pagination cursor (created_at) |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| items | array | Kudos list |
| items[].kudos_id | string | Kudos ID |
| items[].kudos_status | string | pending, confirmed, rejected |
| items[].category | string | Category |
| items[].message_preview | string | First 80 chars of message |
| items[].points_awarded | number | Points |
| items[].created_at | string | Created timestamp |
| items[].confirmed_at | string \| null | Confirmed timestamp |
| items[].stay_id | string | Stay ID |
| items[].company_name | string \| null | Company name |
| next_cursor | string \| null | Next page cursor |
| summary | object | { pending, confirmed, rejected: count } |

## Processing

1. Authenticate; get user_id.
2. Fetch active company_member for user.
3. Query kudos where receiver_company_member_id = member.
4. Apply status, from, to, cursor filters.
5. Join company for company_name.
6. Compute summary counts by status.
7. Return items, next_cursor, summary.
