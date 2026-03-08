# Guest Mobile: My Page

## Screen Overview
Display guest profile summary and menu (Kudos history, profile settings, notification settings).

## Path
`/my-page`

## Display Items

| Item | Description |
|------|------|
| Back | To /home |
| "My Page" | Title |
| Company name | Subtitle (e.g. Grand Hotel) |
| Profile card | Avatar, name (Guest), Anonymous User |
| Stats | Total Sent, This Stay, Remaining (currently mock values) |
| Kudos History | Link to send history |
| Profile Settings | Link to profile edit |
| Notification Settings | Link to settings screen |
| Logout | Logout |
| Footer | Terms of Service, Privacy Policy, Help & Contact |

## Actions

| Action | Behavior |
|------|------|
| Back | To /home |
| Kudos History | To /my-page/kudos |
| Profile Settings | To /my-page/profile |
| Notification Settings | To /my-page/settings |
| Logout | Navigate to / |

## Notes
- Stats are mock due to no login integration. Will fetch from API after login integration.

## Navigation
- `/home` — Back
- `/my-page/kudos` — Kudos history
- `/my-page/profile` — Profile edit
- `/my-page/settings` — Settings
- `/` — Logout
