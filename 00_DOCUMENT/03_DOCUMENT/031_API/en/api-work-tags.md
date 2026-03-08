# API: work-tags

## Overview
List available work tags (debug/admin).

## Endpoint
- **Method:** GET
- **Path:** `/api/make-server-c253248c/work-tags`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| tags | array | Work tag list |
| tags[].work_tag_id | string | Tag ID |
| tags[].work_tag_public_id | string | Public ID |
| tags[].company_id | string | Company ID |
| tags[].intended_action | string | clockin, clockout, auto |
| tags[].work_tag_status | string | active |
| tags[].work_tag_label | string | Label |

## Processing

1. Authenticate.
2. Query work_tag where work_tag_status=active.
3. Order by created_at desc.
4. Return tags.
