# Guest Mobile: Kudos History Screen

## Screen Overview
Display list of Kudos sent by guest. Filterable by search.

## Path
`/my-page/kudos`

## Display Items

| Item | Description |
|------|------|
| Back | To /my-page |
| "Kudos History" | Title |
| Count • Company name | e.g. "5 Kudos • Grand Hotel" |
| Search bar | Search by staff name, job title, category, message |
| Search result count | "X results found" (when searching) |
| Kudos card | Avatar, staff name, job title, company name, category badge, message, date |
| No search results | "No results found" |
| Empty state | "No Kudos sent yet" + Select Staff button |

## Actions

| Action | Behavior |
|------|------|
| Back | To /my-page |
| Search input | Filter with filteredKudos |
| Select Staff | Navigate to /staff (empty state) |

## Data
- Current: mockKudosHistory (mock data)
- Future: Fetch send history from API after login integration

## Navigation
- `/my-page` — Back
- `/staff` — Empty state
