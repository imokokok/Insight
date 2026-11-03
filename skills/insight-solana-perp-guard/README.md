# Insight Solana Perp Guard skill

Focused decision-input skill for opening a perpetual position on Drift
Protocol v2 on Solana mainnet. It wraps the read-only `solana_perp_guard`
decision gate — separate underlying and USDC cross-oracle consensus integrity
checks on canonical mainnet feeds, caller-declared post-action leverage against
a reviewed static profile capped by the freshly observed live Drift margin
ratio, and disclosed on-chain venue evidence (Drift mark price vs Pyth Lazer
oracle deviation, funding rate, open interest, market status) that can escalate
the verdict, returning `ALLOW` / `CAUTION` / `BLOCK`.

## Install

Point any MCP-compatible client at the hosted Insight MCP server using
[`mcp.json`](mcp.json), or install the tool catalog directly:

```json
{
  "mcpServers": {
    "insight": {
      "url": "https://www.oracleinsight.xyz/api/mcp"
    }
  }
}
```

The tool is x402-metered; keyless calls receive a standard x402 v2 challenge and
settle only after a complete decision.

## Boundaries

- Reviewed markets only: SOL, BTC, and ETH perps (USDC margin). Anything else
  fails closed.
- Evidence comes from live Drift v2 on-chain accounts (hand-decoded Anchor
  layouts for PerpMarket and Drift-owned Pyth Lazer oracle accounts). If RPC
  state is unavailable the result discloses that rather than inventing values,
  and a missing oracle deviation fails the verdict closed.
- Leverage caps are static reviewed values validated against the live Drift
  margin ratio; live venue parameters can change. Every result says so.
- Assessment only. Insight does not evaluate the liquidation engine or
  cross-margin portfolio effects, and never signs, submits, or authorizes an
  order. It never accepts or holds a Solana private key, mnemonic, or signature.
- `BLOCK` is a complete paid decision, not an API error.
