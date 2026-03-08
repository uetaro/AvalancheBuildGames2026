# API: my-affiliation-requests

## Overview
List current user's affiliation requests with company names.

## Endpoint
- **Method:** GET
- **Path:** `/api/make-server-c253248c/my-affiliation-requests`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| requests | array | Request list |
| requests[].company_member_request_id | string | Request ID |
| requests[].company_id | string | Company ID |
| requests[].company | object | { company_name } |
| requests[].request_status | string | pending, approved, rejected, cancelled |
| requests[].requested_role | string | Requested role |
| requests[].job_title | string \| null | Job title |
| requests[].request_note | string \| null | Request note |
| requests[].review_note | string \| null | Review note |
| requests[].created_at | string | Created timestamp |
| requests[].updated_at | string | Updated timestamp |

## Processing

1. Authenticate; get user_id.
2. Query company_member_request for user_id.
3. Join company for company_name.
4. Order by created_at desc, limit 50.
5. Return requests.
