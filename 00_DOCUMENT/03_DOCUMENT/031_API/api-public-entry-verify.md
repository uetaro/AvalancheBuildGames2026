# API: public-entry-verify

## Overview
Verify NFC card and create guest session. No auth required. Used when guest taps card at room.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-14a1e5b0/public-entry-verify`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| card_public_id | string | Yes | Card public ID |
| company_public_id | string | No | Optional company match check |
| client_request_id | string | No | Client request ID |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| guest_session_token | string | Opaque token (store for Kudos) |
| expires_at | string | Session expiry |
| stay | object | { stay_id, company_id, company_name, checkin_at, room_code, room_label, card_uid } |
| rules_snapshot | object | Kudos rules (quota, cooldown, etc.) |
| remaining_quota | number | Remaining Kudos for stay |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| CARD_NOT_FOUND | 404 | Card not found |
| CARD_REVOKED | 409 | Card revoked |
| CARD_NOT_ACTIVE | 409 | Card not active |
| CARD_NOT_BOUND | 409 | Card not bound to room |
| NO_ACTIVE_STAY | 409 | No active stay for card |
| COMPANY_SUSPENDED | 423 | Company inactive |
| COMPANY_MISMATCH | 409 | company_public_id mismatch |

## Processing

1. Fetch card by card_public_id; verify active, not revoked.
2. Fetch card_room_binding; verify bound.
3. Fetch active stay for card.
4. Fetch company; verify active.
5. Count Kudos for stay; compute remaining_quota.
6. Create guest_session; generate opaque token.
7. Return token, stay, rules_snapshot, remaining_quota.
