# Staff Web: Stays (Stay Management)

## Screen Overview
Room list and card drag & drop for check-in/check-out. Shared by staff and manager.

## Path
`/staff/stays`, `/manager/stays`

## Display Items

| Item | Description |
|------|------|
| Room list | By floor, room number, status (occupied/vacant/cleaning), stay info |
| Card list | Draggable cards (card_uid, current_room) |
| Room drop zone | Check-in by dropping card |
| Check-out | Check-out from occupied room |
| Stay detail | Check-in datetime, card, Kudos list, confirm/reject |

## Actions

| Action | Behavior |
|------|------|
| Card→Room D&D | ops-checkin |
| Check-out | ops-checkout (includes kudos_decisions) |
| Stay detail | Modal display |
| Refresh | Re-fetch ops-rooms, ops-cards |

## API
- POST ops-rooms
- POST ops-cards
- POST ops-checkin
- POST ops-checkout
