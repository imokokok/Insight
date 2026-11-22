# Polymarket positions in Insight

## Product goal

Insight provides a user-controlled, read-only view of the open Polymarket positions reported for an account or proxy wallet address. The viewer adds portfolio context to Insight's risk-intelligence surface; it does not interpret a position as a recommendation to enter, exit, or redeem.

The account view calls Polymarket Data API v2 `GET /v2/positions` with `status=OPEN`. It validates upstream JSON, follows the API's opaque `next_cursor`, and displays market/outcome, share size, average price, reported current value, unrealized P&L, and redeemable state. The UI shows the loaded-page totals, refresh time, and an upstream indexing caveat.

## User control and privacy

- A user enters the public EVM account/proxy wallet address from Polymarket settings.
- The page never connects a wallet or requests email, password, API credentials, signatures, or account permissions.
- The address stays in page memory by default. The user may opt to remember it in that browser's local storage and can clear it by unchecking the option before the next query.
- Insight's same-origin read endpoint accepts only a valid wallet address and an opaque pagination cursor, then makes a fixed public GET request to Polymarket's Data API. It sends no authentication headers and never accepts a caller-selected upstream URL or HTTP method.
- API responses are not cached by Insight. Upstream rate limits and indexing delay remain visible as read failures or freshness caveats.

## Explicit non-goals

This feature never creates, signs, submits, replaces, or cancels orders. It does not redeem positions, transfer funds, approve token spenders, monitor automatically, fetch private order history, or read wallet balances. The separate Insight Prediction Guard evaluates public market metadata; it is not an account connection and does not execute an action.

## Use

Open `/polymarket` in Insight or choose **Polymarket Positions** under **Risk Intelligence**. Enter the public account/proxy address and select **View positions**. Use **Load more positions** to follow the public API's cursor pages.

The feature is read-only and requires no Polymarket API key or wallet authorization.
