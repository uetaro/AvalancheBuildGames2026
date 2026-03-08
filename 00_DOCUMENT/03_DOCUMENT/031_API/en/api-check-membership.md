# API: check-membership

## Overview
Checks if the authenticated user is a member (staff/manager) of the given company.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-20781d19/check-membership`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| access_token | string | Yes | Supabase Auth JWT |
| company_id | string (uuid) | Yes | Company ID |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| is_member | boolean | Whether user is staff/manager |
| affiliation_id | string \| null | Affiliation ID if member |
| role | string \| null | "staff" or "manager" if member |

## Processing

1. Authenticate; get user_id.
2. Lookup affiliation for (user, company) with active status.
3. Return is_member, affiliation_id, role.
