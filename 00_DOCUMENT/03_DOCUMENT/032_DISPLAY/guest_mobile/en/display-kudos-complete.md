# Guest Mobile: Kudos Send Complete Screen

## Screen Overview
Thank-you screen after successful Kudos send. Shows remaining count and next action guidance.

## Path
`/kudos/complete`

## Display Items

| Item | Description |
|------|------|
| Success icon | Kudos badge + checkmark |
| "Kudos Sent Successfully" | Title |
| "Your appreciation has been delivered" | Subtitle |
| Kudos Remaining | remaining_quota (from state) |
| Pending Notice | "Your Kudos is currently pending and will be confirmed at checkout." |
| Send Another Kudos | Shown only when remaining_quota > 0 |
| Return to Home | To home |
| Support Staff Careers | Link to account create (Create button) |

## Actions

| Action | Behavior |
|------|------|
| Send Another Kudos | Navigate to /staff |
| Return to Home | Navigate to /home |
| Create | Navigate to /account/create |

## Data
- location.state: kudos_id, kudos_status, remaining_quota, staff_display_name, category, etc.
- Save remaining_quota to localStorage

## Navigation
- `/staff` — Send again
- `/home` — Home
- `/account/create` — Account create
