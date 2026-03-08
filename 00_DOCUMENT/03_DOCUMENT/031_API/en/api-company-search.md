# API: company-search

## Overview
Company search by name. Used for affiliation request flow.

## Endpoint
- **Method:** GET
- **Path:** `/api/make-server-c253248c/company-search`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |
| q | query string | Yes | Search query (min 1 char) |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| companies | array | Company list |
| companies[].company_id | string | Company ID |
| companies[].company_name | string | Company name |
| companies[].company_status | string | Company status |

## Processing

1. Authenticate via Bearer token.
2. If q is empty, return empty array.
3. Query company where company_status=active and company_name ILIKE %q%.
4. Order by company_name, limit 20.
5. Return companies.
