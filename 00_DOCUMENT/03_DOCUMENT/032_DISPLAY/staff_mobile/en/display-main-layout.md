# Staff Mobile: Main Layout

## Screen Overview
Common layout for /app routes. Display child screens via Outlet, switch between Kudos / Work / Point / Account with bottom tabs.

## Path
`/app` (parent of child routes)

## Display Items

| Item | Description |
|------|------|
| Main area | Outlet (child screen) |
| Bottom tabs | Kudos, Work, Point, Account |
| Active indicator | Colored bar for selected tab |
| Avatar | Profile image (from my-profile) |

## Tab Configuration

| Tab | Path | Color |
|------|------|-----|
| Kudos | /app/kudos | #FF6B6B |
| Work | /app/work | #5BA5A5 |
| Point | /app/point | #C9A227 |
| Account | /app/account | #D4A574 |

## Actions
- Tab tap: Navigate to corresponding path
- No session: Redirect to /
