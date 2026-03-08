# API: ops-members

## Overview
Returns staff list for a company (for ops/admin use).

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-20781d19/ops-members`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| access_token | string | Yes | Supabase Auth JWT |
| company_id | string (uuid) | Yes | Company ID |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| items | array | Staff list |
| items[].staff_id | string | Staff ID |
| items[].display_name | string | Display name |
| items[].email | string \| null | Email |
| items[].avatar_url | string \| null | Avatar URL |
| items[].role | string | "staff" or "manager" |
| items[].affiliation_id | string | Affiliation ID |

## Processing

1. Authenticate; verify caller is manager of company.
2. Fetch affiliations for company with staff details.
3. Return items.
