# Guest Mobile: Home Screen

## Screen Overview
Display stay information and Kudos remaining count, with navigation to Send Kudos and Sent Kudos.

## Path
`/home`

## Display Items

| Item | Description |
|------|------|
| Company name | stay_data.company_name |
| My Page button | Header right, User icon |
| Welcome / Guest | Welcome message |
| Room | Room code, room label |
| Kudos Available | remaining_quota / total_quota |
| Card-style area | Logo, Room, Card Number, Check-in datetime |
| Send Kudos | Main CTA (disabled when remaining is 0) |
| Sent Kudos | Link to send history |
| Have an Account? | Link to login/signup |

## Actions

| Action | Behavior |
|------|------|
| My Page | Navigate to /my-page |
| Send Kudos | Navigate to /staff when remaining_quota > 0 |
| Sent Kudos | Navigate to /my-page/kudos |
| Login or Sign Up | Navigate to /account/create |

## Data Source
- localStorage: stay_data, remaining_quota, rules_snapshot
- Reload quota on focus / visibilitychange

## Navigation
- `/my-page` — My Page
- `/staff` — Staff selection
- `/my-page/kudos` — Kudos history
- `/account/create` — Account create
