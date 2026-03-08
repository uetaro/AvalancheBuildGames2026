# Staff Web: Affiliation (Affiliation Request Management)

## Screen Overview
For managers. List affiliation requests, approve/reject.

## Path
`/manager/affiliation`

## Display Items

| Item | Description |
|------|------|
| Status filter | pending, approved, rejected, cancelled |
| Search | Search by applicant name, email |
| Request list | app_display_name, email, requested_role, request_status, request_note, job_title, created_at |
| Approve/Reject | Approve / Reject button for each request |
| AI chat | Request review support (optional) |

## Actions

| Action | Behavior |
|------|------|
| Approve | ops-affiliation-requests-decide (decision=approve) |
| Reject | ops-affiliation-requests-decide (decision=reject) |
| Refresh | Re-fetch ops-affiliation-requests |

## API
- POST ops-affiliation-requests
- POST ops-affiliation-requests-decide
