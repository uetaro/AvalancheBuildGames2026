# Staff Mobile: Login Screen

## Screen Overview
Login with email/password or sign up. Redirect to /app if session exists.

## Path
`/`

## Display Items

| Item | Description |
|------|------|
| Logo | Heartel logo |
| Email input | email |
| Password input | password |
| Login button | When mode=login |
| Sign up button | When mode=signup |
| Mode toggle | Login / Sign Up link |
| Error message | On auth failure |
| Loading | During processing |

## Actions

| Action | Behavior |
|------|------|
| Login | signInWithPassword → /app on success |
| Sign up | signup API (POST) → /app on success |
| Mode toggle | Switch between login ⇔ signup |

## API
- Supabase Auth: signInWithPassword
- POST signup (serverUrl)

## Navigation
- `/app` — On login/signup success, or when existing session
