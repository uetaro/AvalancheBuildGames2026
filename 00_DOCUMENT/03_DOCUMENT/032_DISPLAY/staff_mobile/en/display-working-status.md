# Staff Mobile: Working Status Screen

## Screen Overview
Display attendance status and execute check-in/check-out via NFC tap (work-tap).

## Path
`/app` (index), `/app/work`

## Display Items

| Item | Description |
|------|------|
| Current time | Updates every second |
| Work status | On duty / Off duty |
| Check-in start time | When on duty |
| Tap button | Execute check-in/check-out (NFC simulate) |
| Debug panel | Tag list, selection, send test |
| Toast | Success/error/info message |

## Actions

| Action | Behavior |
|------|------|
| Tap | POST work-tap API (work_tag_public_id) |
| Debug panel | Get work-tags, select tag, send |

## API
- GET work-status
- POST work-tap
- GET work-tags (debug)

## Navigation
- /app/work/activity — Work history (optional)
