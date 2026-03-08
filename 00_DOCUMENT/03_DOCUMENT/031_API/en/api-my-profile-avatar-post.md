# API: my-profile/avatar (POST)

## Overview
Upload avatar image. Replaces existing avatar. JPEG, PNG, WebP, GIF up to 5MB.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-c253248c/my-profile/avatar`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |
| avatar | file | Yes | Image file (multipart/form-data) |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| avatar_url | string \| null | Signed URL |
| path | string | Storage path |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| VALIDATION_ERROR | 400 | Invalid file type or size > 5MB |

## Processing

1. Authenticate; get user_id.
2. Validate file type (jpeg, png, webp, gif), size ≤ 5MB.
3. Remove existing avatar files.
4. Upload to Storage (userId/avatar.{ext}).
5. Create signed URL; return avatar_url, path.
