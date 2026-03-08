# API: affiliation-request (DELETE)

## Overview
Cancel a pending affiliation request.

## Endpoint
- **Method:** DELETE
- **Path:** `/api/make-server-c253248c/affiliation-request/:id`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |
| id | path | Yes | company_member_request_id |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| success | boolean | true |
| request_status | string | cancelled |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| NOT_FOUND | 404 | Request not found |
| FORBIDDEN | 403 | Not user's request |
| INVALID_STATUS | 409 | Only pending requests can be cancelled |

## Processing

1. Authenticate; get user_id.
2. Fetch request by id.
3. Verify user_id matches; verify request_status=pending.
4. Update request_status to cancelled.
5. Return success.
