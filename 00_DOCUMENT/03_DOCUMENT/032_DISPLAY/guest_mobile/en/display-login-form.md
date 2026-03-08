# Guest Mobile: Login Form Screen

## Screen Overview
Login with email/password.

## Path
`/login`

## Display Items
- Back
- Title
- Email input
- Password input
- Login button
- Password reset link (optional)

## Actions
- Login: Supabase Auth signInWithPassword
- On success: Navigate to /home or /my-page

## Navigation
- `/` — Back
- `/home` or `/my-page` — On login success
