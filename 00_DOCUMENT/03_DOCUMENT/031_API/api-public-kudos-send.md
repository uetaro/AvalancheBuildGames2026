# API: public-kudos-send

## Overview
Guest sends Kudos to staff. Requires valid guest session. Applies quota, cooldown, AI moderation, creates chain_receipt (queued).

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-14a1e5b0/public-kudos-send`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| X-Guest-Session-Token | header | Yes | Guest session token |
| receiver_company_member_id | string | Yes | Staff to receive Kudos |
| category | string | Yes | Category (non-empty) |
| message_text | string | Yes | Message (1–500 chars) |

## Output (Success: 201)

| Item | Type | Description |
|------|------|-------------|
| kudos_id | string | Created Kudos ID |
| kudos_status | string | pending or rejected |
| remaining_quota | number | Remaining Kudos for stay |
| cooldown_sec | number | Cooldown seconds |
| next_available_at | string \| null | Next send allowed time |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| INVALID_GUEST_SESSION | 401 | Invalid/expired token |
| POST_CHECKOUT_WINDOW_EXPIRED | 409 | Past post-checkout deadline |
| RECEIVER_NOT_FOUND | 404 | Staff not found/inactive |
| RECEIVER_NOT_ON_DUTY | 409 | Staff not on duty |
| QUOTA_EXCEEDED | 409 | Stay Kudos quota exceeded |
| COOLDOWN_ACTIVE | 409 | Cooldown not elapsed |
| CONTENT_MODERATION_FAILED | 400 | AI score below threshold |

## Processing

1. Validate guest session; get stay_id, company_id.
2. Validate receiver (same company, active, allowed role).
3. Verify receiver is on duty.
4. Check stay rules: quota, cooldown, post_checkout_window.
5. AI content scoring; reject if below threshold.
6. Insert kudos (status pending or rejected).
7. Compute anchor_hash; insert chain_receipt (queued).
8. Insert kudos_moderation record.
9. Return kudos_id, remaining_quota, etc.
