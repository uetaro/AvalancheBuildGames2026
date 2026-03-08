# API: career-chat

## Overview
AI career consultation. Stateless, no history. Uses OpenAI gpt-4o-mini.

## Endpoint
- **Method:** POST
- **Path:** `/api/make-server-c253248c/career-chat`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |
| message | string | Yes | User message |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| reply | string | AI reply |

## Output (Error)

| error_code | HTTP | Description |
|------------|------|-------------|
| CONFIG_ERROR | 503 | OPENAI_API_KEY not configured |
| AI_ERROR | 502 | OpenAI API error |

## Processing

1. Authenticate.
2. Validate message non-empty.
3. Call OpenAI chat/completions (system: career advisor, user: message).
4. Return reply.
