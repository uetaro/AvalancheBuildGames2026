# Staff Mobile: Affiliation Request

## Screen Overview
Company search, create/list/cancel affiliation requests.

## Path
`/app/account/affiliation`

## Display Items

| Item | Description |
|------|------|
| Company search | company-search API, search bar |
| Create request | company_id, request_note, job_title |
| Request list | my-affiliation-requests, status display |
| Cancel | Delete pending requests |

## Actions

| Action | Behavior |
|------|------|
| Search | GET company-search?q= |
| Create request | POST affiliation-request |
| Cancel | DELETE affiliation-request/:id |

## API
- GET company-search
- POST affiliation-request
- GET my-affiliation-requests
- DELETE affiliation-request/:id

## Navigation
- /app/account — Back
