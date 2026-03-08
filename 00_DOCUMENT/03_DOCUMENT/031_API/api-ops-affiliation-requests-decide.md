# API: ops-affiliation-requests-decide

## Overview
Approve or reject an affiliation request. Manager only. Uses optimistic locking.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-20781d19/ops-affiliation-requests-decide`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| access_token | string | Yes | Supabase Auth JWT |
| company_id | string (uuid) | Yes | Company ID |
| company_member_request_id | string (uuid) | Yes | Request ID |
| decision | string | Yes | "approve" or "reject" |
| review_note | string | No | Review note |
| granted_role | string | No | employee, staff, manager (default: staff) |
| expected_version | number | Yes | Optimistic lock version |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| company_member_request_id | string | Request ID |
| request_status | string | approved or rejected |
| reviewed_at | string | Reviewed timestamp |
| reviewed_by_company_member_id | string | Reviewer ID |
| company_member_id | string \| null | Created/updated member ID (approve only) |
| version | number | New version |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| REQUEST_NOT_FOUND | 404 | Request not found |
| VERSION_CONFLICT | 409 | expected_version mismatch |
| ALREADY_DECIDED | 409 | Request not pending |

## Processing

1. Authenticate; verify manager.
2. Fetch request; verify company match and version.
3. If decision=approve: create or reactivate company_member, update request to approved.
4. If decision=reject: update request to rejected.
5. Write audit_log.
6. Return result.
