# API: ops-affiliation-requests

## Overview
Returns list of affiliation (company member) requests for a company. Manager only.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-20781d19/ops-affiliation-requests`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| access_token | string | Yes | Supabase Auth JWT |
| company_id | string (uuid) | Yes | Company ID |
| status | string | No | Comma-separated: pending, approved, rejected, cancelled (default: pending) |
| limit | number | No | Page size (1–200, default: 50) |
| cursor | string | No | Pagination cursor (created_at) |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| items | array | Request list |
| items[].company_member_request_id | string | Request ID |
| items[].user_id | string | User ID |
| items[].app_display_name | string | User display name |
| items[].email | string \| null | User email |
| items[].requested_role | string | Requested role |
| items[].request_status | string | pending, approved, rejected, cancelled |
| items[].request_note | string \| null | Request note |
| items[].job_title | string \| null | Job title |
| items[].review_note | string \| null | Review note |
| items[].reviewed_at | string \| null | Reviewed timestamp |
| items[].created_at | string | Created timestamp |
| next_cursor | string \| null | Next page cursor |

## Processing

1. Authenticate; verify caller is manager of company.
2. Parse status filter (default: pending).
3. Query company_member_request for company with status filter.
4. Join user table for display_name, email.
5. Return items with pagination.
