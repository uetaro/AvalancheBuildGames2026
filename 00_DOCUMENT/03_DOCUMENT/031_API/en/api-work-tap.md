# API: work-tap

## Overview
Clock in/out via NFC work tag tap. Creates or ends on_duty_session.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-c253248c/work-tap`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |
| work_tag_public_id | string | Yes | Work tag public ID |
| tapped_at | string (ISO8601) | No | Tap time (default: now) |
| client_request_id | string | No | Client request ID |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| action | string | clockin or clockout |
| company_id | string | Company ID |
| on_duty_session_id | string | Session ID |
| started_at | string \| null | Started time (clockin) |
| ended_at | string \| null | Ended time (clockout) |
| message | string | "出勤しました" or "退勤しました" |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| WORK_TAG_NOT_FOUND | 404 | Tag not found |
| WORK_TAG_REVOKED | 409 | Tag revoked |
| FORBIDDEN_NOT_MEMBER | 403 | Not member of company |
| ALREADY_ON_DUTY | 409 | Already clocked in |
| NOT_ON_DUTY | 409 | Not clocked in (clockout) |

## Processing

1. Authenticate; get user_id.
2. Fetch work_tag by work_tag_public_id; verify active.
3. Verify user is active company_member of tag's company.
4. Check intended_action (clockin/clockout/auto).
5. If auto: toggle based on active session.
6. If clockin: create on_duty_session; return action=clockin.
7. If clockout: update session duty_status=ended; return action=clockout.
