# API: my-profile (PUT)

## Overview
Update company member profile. Uses optimistic locking (expected_version).

## Endpoint
- **Method:** PUT
- **Path:** `/api/make-server-c253248c/my-profile`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |
| expected_version | number | Yes | Current version for optimistic lock |
| display_name_override | string | No | Display name (max 50) |
| job_title | string | No | Job title (max 50) |
| public_profile_json | object | No | Public profile JSON |
| visibility_scope | string | No | company, group, platform |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| company_member_id | string | Member ID |
| version | number | New version |
| updated_at | string | Updated timestamp |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| VERSION_CONFLICT | 409 | expected_version mismatch |

## Processing

1. Authenticate; get active company_member.
2. Validate expected_version; build update object.
3. Update company_member with version check.
4. Return updated version, updated_at.
