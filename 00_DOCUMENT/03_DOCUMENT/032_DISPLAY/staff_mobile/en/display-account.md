# Staff Mobile: Account

## Screen Overview
Profile display/edit, publication scope, shared URL, and affiliation request entry.

## Path
`/app/account`, `/app/account/profile`, `/app/account/profile/edit`

## Display Items

| Item | Description |
|------|------|
| Profile | Avatar, display name, email, company, job title |
| Edit link | To /app/account/profile/edit |
| Publication scope | /app/account/publication |
| Shared URL | /app/account/shared-url |
| Affiliation request | /app/account/affiliation |

## Actions

| Action | Behavior |
|------|------|
| Profile edit | PUT my-profile |
| Avatar | POST/DELETE my-profile/avatar |

## API
- GET my-profile
- PUT my-profile
- POST my-profile/avatar
- DELETE my-profile/avatar

## Navigation
- /app/account/profile/edit — Profile edit
- /app/account/publication — Publication scope
- /app/account/shared-url — Shared URL
- /app/account/affiliation — Affiliation request
