# Guest Mobile: Kudos Send Screen

## Screen Overview
Send Kudos to staff with category and message.

## Path
`/kudos/:staffId`

## Display Items

| Item | Description |
|------|------|
| Back | To /staff |
| "Send Kudos" | Title |
| To | Staff card (avatar, name, job title) |
| Category * | 6 categories (Hospitality, Professionalism, Kindness, Quick Response, Friendly, Other) |
| Message * | Text area (max 500 chars), counter display |
| Moderation error | Show suggestion when CONTENT_MODERATION_FAILED |
| Notice | "Your Kudos will be recorded as staff evaluation..." |
| Send button | Disabled when category or message not entered |
| Confirm dialog | "Send Kudos?" / Send / Cancel |
| Sending overlay | Lottie animation + "Checking your post..." |

## Actions

| Action | Behavior |
|------|------|
| Category select | Update selectedCategory |
| Message input | Update message, clear moderationSuggestion |
| Send button | Show confirm dialog |
| Confirm dialog Send | POST public-kudos-send API |
| Confirm dialog Cancel | Close dialog |
| Back | To /staff |

## API
- POST public-kudos-send (receiver_company_member_id, category, message_text)

## Error Display
- QUOTA_EXCEEDED, COOLDOWN_ACTIVE, POST_CHECKOUT_WINDOW_EXPIRED, RECEIVER_NOT_FOUND, RECEIVER_NOT_ON_DUTY, UNAUTHORIZED, GUEST_SESSION_EXPIRED, etc.

## Navigation
- `/staff` — Back
- `/kudos/complete` — On send success (pass result via state)
