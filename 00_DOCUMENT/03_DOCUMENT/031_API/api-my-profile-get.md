# API: my-profile (GET)

## Overview
Get current user profile including company membership and avatar.

## Endpoint
- **Method:** GET
- **Path:** `/api/make-server-c253248c/my-profile`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| user_id | string | User ID |
| email | string | Email |
| display_name | string | Display name |
| auth_name | string \| null | Auth metadata name |
| avatar_url | string \| null | Avatar signed URL |
| has_company | boolean | Has active membership |
| company_member | object \| null | { company_member_id, company_id, company_name, member_role, display_name_override, job_title, public_profile_json, visibility_scope, version, updated_at } |

## Processing

1. Authenticate; get user_id.
2. Fetch auth user (email, metadata).
3. Fetch active company_member; join company for company_name.
4. Fetch avatar from Storage; create signed URL.
5. Return profile.
