# Staff Web: Card Master

## Screen Overview
Card list, room binding/unbinding. Shared by staff and manager.

## Path
`/staff/card-master`, `/manager/card-master`

## Display Items

| Item | Description |
|------|------|
| Search | Search by card number |
| Filter | all / active / issued / revoked |
| Card list | card_uid, card_status, current_room, active_stay |
| Binding edit | Update binding with room selection |
| Unbind | Change to Unbound |

## Actions

| Action | Behavior |
|------|------|
| Change binding | POST ops-update-card-binding |
| Refresh | Re-fetch ops-cards-all, ops-rooms |

## API
- POST ops-cards-all
- POST ops-rooms
- POST ops-update-card-binding
