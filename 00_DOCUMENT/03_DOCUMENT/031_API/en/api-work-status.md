# API: work-status

## Overview
Get current work (on-duty) status for authenticated user.

## Endpoint
- **Method:** GET
- **Path:** `/api/make-server-c253248c/work-status`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| on_duty | boolean | Whether user is on duty |
| session | object \| null | Active session (on_duty_session_id, company_id, started_at, duty_status) or null |
| member | object \| null | company_member_id, company_id or null |

## Processing

1. Authenticate; get user_id.
2. Fetch active company_member for user.
3. Fetch active on_duty_session for member.
4. Return on_duty, session, member.
