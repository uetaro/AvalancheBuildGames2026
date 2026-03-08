# API: public-staff-list

## Overview
Returns on-duty staff for the guest's stay company. Requires guest session.

## Endpoint
- **Method:** GET
- **Path:** `/api/make-server-14a1e5b0/public-staff-list`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| X-Guest-Session-Token | header | Yes | Guest session token |
| limit | query | No | Page size (1–200, default: 50) |
| job_title | query | No | Filter by job title (partial match) |
| cursor | query | No | Pagination cursor (started_at) |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| items | array | Staff list |
| items[].company_member_id | string | Member ID |
| items[].display_name | string | Display name |
| items[].job_title | string \| null | Job title |
| items[].profile_image_url | string \| null | Avatar signed URL |
| items[].on_duty_started_at | string \| null | Duty start time |
| next_cursor | string \| null | Next page cursor |

## Processing

1. Validate guest session; get company_id.
2. Fetch active on_duty_sessions for company.
3. Fetch company_members (active, employee/staff/manager).
4. Join user for display_name fallback.
5. Fetch avatar signed URLs from Storage.
6. Apply job_title filter; sort by on_duty_started_at desc.
7. Return items, next_cursor.
