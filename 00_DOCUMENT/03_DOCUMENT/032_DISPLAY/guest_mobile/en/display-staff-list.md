# Guest Mobile: Staff Selection Screen

## Screen Overview
Display list of on-duty staff and select Kudos recipient.

## Path
`/staff`

## Display Items

| State | Item | Description |
|------|------|------|
| Common | Back button | To /home |
| Common | "Select Staff" | Title |
| Success | Search bar | Search by staff name, job title |
| Success | Job title filter | All + unique job_title chips |
| Success | Staff list | Avatar, name, job title, On duty since |
| Success | When remaining 0 | "You've used all your Kudos for this stay." |
| Loading | Spinner | "Loading staff..." |
| Error | Error message + Retry | |
| Session expired | Message + Re-scan Card | |
| Empty | "No staff currently on duty" | Refresh button |
| No search results | "No staff members match your search" | |

## Actions

| Action | Behavior |
|------|------|
| Staff row tap | Navigate to /kudos/:staffId when not quotaExhausted (pass staff info via state) |
| Back | To /home |
| Retry | Re-run fetchStaffList |
| Re-scan Card | Navigate to / |
| Refresh | Re-run fetchStaffList |

## API
- GET public-staff-list (X-Guest-Session-Token required)

## Navigation
- `/home` — Back
- `/kudos/:staffId` — Kudos send screen
