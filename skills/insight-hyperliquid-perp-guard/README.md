# Insight Hyperliquid Perp Guard skill

Focused decision-input skill for opening a perpetual position on the Hyperliquid
HyperCore venue. It wraps the read-only `hyperliquid_perp_guard` decision gate —
separate underlying and USDC cross-oracle consensus integrity checks on canonical
mainnet feeds, caller-declared post-action leverage against a reviewed static cap
validated by the freshly observed venue leverage limit, and disclosed venue
evidence (mark/oracle divergence, consensus-vs-venue deviation, displayed depth)
that can escalate the verdict, returning `ALLOW` / `CAUTION` / `BLOCK` — and the
`hyperliquid_perp_guard_exact_call` variant that binds one unsigned Hyperliquid
IOC order envelope into a short-lived EIP-712 decision attestation over the
envelope intent hash.

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

- Reviewed markets only: BTC and ETH perps (USDC margin). Anything else fails
  closed.
- Leverage caps are static reviewed values validated against the freshly
  observed venue limit; live venue parameters can change. Every result says so.
- Assessment only. Insight does not evaluate the liquidation engine or
  cross-margin portfolio effects, and never signs, submits, or authorizes an
  order. It never accepts or holds a Hyperliquid API key, private key, nonce,
  or signature.
- Exact-call decisions bind one unsigned IOC order envelope (single order,
  side matching the assessed action, notional within the reviewed tolerance of
  the declared size, unexpired window, builder fee within the venue cap) but
  remain decision evidence, not execution authority. Sign the exact envelope in
  the account owner's own wallet or approved API-wallet process.
- `BLOCK` is a complete paid decision, not an API error.

See the scenario rationale in [the research document](../../docs/research/2026-11-03-hyperliquid-perp-guard-research.md).
