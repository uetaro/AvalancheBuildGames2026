# API: signup

## Overview
Staff signup. Creates staff profile and links to company via affiliation.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-20781d19/signup`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| access_token | string | Yes | Supabase Auth JWT |
| company_id | string (uuid) | Yes | Company ID |
| display_name | string | Yes | Display name |
| email | string | No | Email |
| avatar_url | string | No | Avatar URL |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| staff_id | string | Created staff ID |
| affiliation_id | string | Affiliation ID |
| display_name | string | Display name |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| UNAUTHORIZED | 401 | Invalid token |
| VALIDATION_ERROR | 400 | Missing company_id/display_name |
| CONFLICT | 409 | Already signed up (staff exists for user) |

## Processing

1. Authenticate; get user_id from JWT.
2. Validate company exists and is active.
3. Check if staff already exists for user; if so return conflict.
4. Create staff record (display_name, email, avatar_url).
5. Create affiliation (staff, company, role=staff).
6. Return staff_id, affiliation_id, display_name.
