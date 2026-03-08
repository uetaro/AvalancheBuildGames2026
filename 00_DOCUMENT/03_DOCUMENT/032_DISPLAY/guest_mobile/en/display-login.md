# Guest Mobile: Login / Top Screen

## Screen Overview
Entry point for guest app. Choose to continue as guest, login, or sign up.

## Path
`/`

## Display Items

| Item | Description |
|------|------|
| Logo | Heartel logo |
| Company name | Last stay's company_name (from localStorage) |
| HEARTEL | Brand label |
| Debug toggle | Avalanche Test (Room 401) ON/OFF |
| Continue as Guest | Continue as guest button (ON: navigate to debug URL / OFF: NFC tap guidance) |
| Login | Navigate to login screen |
| Sign Up | Navigate to account create screen |

## Actions

| Action | Behavior |
|------|------|
| Continue as Guest tap | Debug ON: Navigate to /entry?c=...&co=... / OFF: Wait for NFC tap |
| Login tap | Navigate to /login |
| Sign Up tap | Navigate to /account/create |
| Debug toggle | Toggle test card URL on/off |

## Navigation
- `/entry` — Guest entry verification
- `/login` — Login
- `/account/create` — Account create
