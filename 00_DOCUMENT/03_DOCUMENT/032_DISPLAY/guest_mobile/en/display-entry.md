# Guest Mobile: Entry Verification Screen

## Screen Overview
Verify card via URL parameters (c=card_public_id, co=company_public_id) and create guest session.

## Path
`/entry`

## Display Items

| State | Item | Description |
|------|------|------|
| Verifying | Kudos badge | Animated display |
| Verifying | "Verifying your card…" | Loading message |
| Error | Error icon | Red |
| Error | "Unable to Verify Card" | Title |
| Error | Error message | Message based on error_code |
| Error | Try Again | Shown only when canRetry=true |
| Error | Back to Start | Return to top |
| Error | Error Code | Shown only when canRetry=false |

## Actions

| Action | Behavior |
|------|------|
| Try Again | Re-execute public-entry-verify API |
| Back to Start | Navigate to / |

## Processing Flow
1. Get c (card_public_id), co (company_public_id) from URL
2. POST public-entry-verify API
3. Success: Save guest_session_token, stay_data, rules_snapshot, remaining_quota to localStorage and navigate to /home
4. Failure: Display error (message based on error_code)

## Navigation
- `/home` — On success
- `/` — On Back to Start
