# API: my-profile/avatar (DELETE)

## Overview
Delete avatar image.

## Endpoint
- **Method:** DELETE
- **Path:** `/api/make-server-c253248c/my-profile/avatar`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| success | boolean | true |

## Processing

1. Authenticate; get user_id.
2. List avatar files in Storage.
3. Remove avatar files.
4. Return success.
