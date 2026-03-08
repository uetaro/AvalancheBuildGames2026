# API: affiliation-request

## Overview
Create affiliation (company member) request. Staff/employee side.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-c253248c/affiliation-request`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |
| company_id | string (uuid) | Yes | Company ID |
| request_note | string | No | Request note |
| job_title | string | No | Job title |
| client_request_id | string | No | Client request ID |

## Output (Success: 201)

| Item | Type | Description |
|------|------|-------------|
| company_member_request_id | string | Created request ID |
| request_status | string | pending |
| requested_role | string | employee |
| job_title | string \| null | Job title |
| created_at | string | Created timestamp |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| COMPANY_NOT_FOUND | 404 | Company not found |
| COMPANY_SUSPENDED | 423 | Company inactive |
| ALREADY_MEMBER | 409 | User already member |
| REQUEST_ALREADY_PENDING | 409 | Pending request exists |

## Processing

1. Authenticate; get user_id.
2. Validate company exists and is active.
3. Check not already member.
4. Check no pending request for same company.
5. Insert company_member_request (request_status=pending, requested_role=employee).
6. Return created record.
