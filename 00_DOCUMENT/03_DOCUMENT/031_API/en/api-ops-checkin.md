# API: ops-checkin

## Overview
Check-in API. Creates an active stay record when a guest checks in with a card at a room.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-20781d19/ops-checkin`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| access_token | string | Yes | Supabase Auth JWT |
| company_id | string (uuid) | Yes | Company ID |
| room_id | string (uuid) | Yes | Room ID |
| card_id | string (uuid) | Yes | Card ID |
| checkin_at | string (ISO8601) | No | Check-in time (default: now) |
| client_request_id | string | No | Client request ID for tracing |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| stay_id | string (uuid) | Created stay ID |
| checkin_at | string | Check-in timestamp |
| rules_snapshot | object | Kudos rules (quota, cooldown, points, etc.) |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing token |
| VALIDATION_ERROR | 400 | Missing room_id/card_id, room not found, card revoked, card not bound to room |
| CONFLICT | 409 | Room or card already has active stay |

## Processing

1. Authenticate via access_token; verify caller is active staff/manager of company.
2. Validate room belongs to company and is active.
3. Validate card belongs to company and is not revoked.
4. Validate card_room_binding exists (card bound to room).
5. Prevent double check-in: no active stay for room or card.
6. Insert stay record with stay_status=active, rules_snapshot.
7. Return stay_id and checkin_at.
