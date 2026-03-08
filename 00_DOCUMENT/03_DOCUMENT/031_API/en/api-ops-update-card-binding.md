# API: ops-update-card-binding

## Overview
Binds a card to a room or unbinds it. Updates card_room_binding.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-20781d19/ops-update-card-binding`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| access_token | string | Yes | Supabase Auth JWT |
| company_id | string (uuid) | Yes | Company ID |
| card_id | string (uuid) | Yes | Card ID |
| room_id | string (uuid) | No | Room ID to bind (omit to unbind) |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| card_room_binding_id | string | Binding ID |
| card_id | string | Card ID |
| room_id | string \| null | Room ID (null if unbound) |
| action | string | "bound" or "unbound" |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| VALIDATION_ERROR | 400 | Card/room not found, card has active stay (when binding) |
| CONFLICT | 409 | Card revoked, room inactive |

## Processing

1. Authenticate; verify staff/manager.
2. Validate card and room belong to company.
3. If binding: unbound current binding, create new binding.
4. If unbinding: set unbound_at on current binding.
5. Return result.
