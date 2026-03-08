# API: my-point-balance

## Overview
Point balance, this month earned, and 6-month trend for confirmed Kudos.

## Endpoint
- **Method:** GET
- **Path:** `/api/make-server-c253248c/my-point-balance`

## Input

| Item | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | header | Yes | Bearer token |

## Output (Success: 200)

| Item | Type | Description |
|------|------|-------------|
| balance | number | Total confirmed points |
| this_month | number | Points earned this month |
| monthly_trend | array | [{ month, points }] last 6 months |

## Processing

1. Authenticate; get active company_member.
2. Sum points_awarded for confirmed Kudos (total balance).
3. Sum points for this month.
4. Build monthly_trend for last 6 months.
5. Return balance, this_month, monthly_trend.
