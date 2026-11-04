# Insight Base Perp Guard skill

Focused decision-input skill for opening a Synthetix Perps V3 position on Base mainnet. It wraps the read-only `base_perp_guard` decision gate — separate underlying and USDC margin oracle integrity checks plus caller-declared post-action leverage against reviewed market caps, with disclosed spot/TWAP/in-range liquidity evidence for the underlying when a reviewed Base spot market exists (ETH today; context only, not oracle consensus, and observed thin execution liquidity can downgrade an `ALLOW` to `CAUTION`), returning `ALLOW` / `CAUTION` / `BLOCK` — and the `base_perp_guard_exact_call` variant that binds one unsigned direct PerpsMarketProxy `commitOrder` call into a short-lived EIP-712 decision attestation.

## Install

Point any MCP-compatible client at the hosted Insight MCP server using [`mcp.json`](mcp.json), or install the tool catalog directly:

```json
{
  "mcpServers": {
    "insight": {
      "url": "https://www.oracleinsight.xyz/api/mcp"
    }
  }
}
```

The tool is x402-metered; keyless calls receive a standard x402 v2 challenge and settle only after a complete decision.

## Boundaries

- Reviewed markets only: BTC, ETH, SOL, XRP, DOGE, PEPE (USDC margin). Anything else fails closed.
- Leverage caps are static reviewed values; live Synthetix governance parameters can change. Every result says so.
- Liquidity evidence is disclosed context from one reviewed Base DEX venue (spot, TWAP deviation, in-range balances, quote ladder); it never enters oracle consensus, and unavailability is disclosed, never fabricated.
- Assessment only. Insight does not evaluate the venue's mark-price aggregation, funding, or liquidation engine, and never signs, broadcasts, or authorizes an order.
- Exact-call decisions bind one unsigned `commitOrder` call (canonical proxy, reviewed market id, settlement strategy 0, direction-matching sizeDelta, no tracking code or referrer) but remain decision evidence, not execution authority. Margin must already be in the Synthetix account.
- `BLOCK` is a complete paid decision, not an API error.

See the full contract in [docs/base-perp-guard.md](../../docs/base-perp-guard.md) and the scenario rationale in [the research document](../../docs/research/2026-11-02-base-perp-guard-research.md).
