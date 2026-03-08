# Guest Mobile: Account Create Screen

## Screen Overview
Two-step account creation. Step 1: Contact (email or phone), Step 2: Profile information.

## Path
`/account/create`

## Display Items

### Step 1 (contact)
| Item | Description |
|------|------|
| Back | To / |
| "Create Account" | Title |
| "Step 1/2 • Grand Hotel" | Subtitle |
| Description | Register with email or phone number |
| Email (Optional) | Email input |
| or | Separator |
| Phone Number (Optional) | Phone number input |
| Continue | Next |

### Step 2 (profile)
| Item | Description |
|------|------|
| Back | To Step 1 |
| "Step 2/2 • Grand Hotel" | Subtitle |
| Display Name | Display name |
| Gender | Gender selection |
| Birth Date | Date of birth |
| Bio | Self-introduction |
| Profile Visibility | public / staff-only / private |
| Complete | Complete |

## Actions

| Action | Behavior |
|------|------|
| Continue | Proceed to Step 2 if email or phone is provided |
| Complete | Navigate to /my-page (currently simulated) |
| Back | Step 2→1 or 1→top |

## Notes
- Currently no Supabase Auth integration. Future: signUp / profile API integration planned.

## Navigation
- `/` — Step 1 back
- `/my-page` — On completion
