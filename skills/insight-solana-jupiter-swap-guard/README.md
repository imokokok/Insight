# Insight Solana Jupiter Swap Guard

This package exposes the existing Jupiter route guard through the unified MCP
surface for Solana agent distribution.

## Quick install

1. Add [`mcp.json`](mcp.json) to an MCP-compatible host.
2. Discover the catalog with `initialize` and `tools/list`.
3. Call `prepare_swap` with `venue: "solana_jupiter"`, or use the equivalent
   `trade_guard` swap action.
4. Stop on `unavailable`, `rejected`, or a non-approved coverage result.
5. Bind the exact returned transaction with PriorSeal before signing.

This is a route-level guard with reviewed-pool coverage. It is not a claim
that every Jupiter route or every Solana venue is safe.
