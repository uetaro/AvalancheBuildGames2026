# API: health

## Overview
Health check endpoint. No auth required.

## Endpoint
- **Method:** GET
- **Path:** `/api/health`

## Input
None.

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| status | string | "ok" |

## Processing
Return { status: "ok" }.
