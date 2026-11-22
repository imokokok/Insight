# Insight Hyperliquid Perp Guard skill

Pre-trade safety gate for HyperCore venue perpetual orders on Hyperliquid L1,
with double underlying and USDC cross-oracle consensus integrity checks.

## Tool mapping

| What you want to do     | Canonical MCP tool | `op` selector        | Deprecated alias     |
| ----------------------- | ------------------ | -------------------- | -------------------- |
| Pre-perp safety gate    | `trade_guard`      | `check_safety`       | `check_trade_safety` |
| Prepare a perp order    | `trade_guard`      | `prepare_perp_order` | `prepare_perp_order` |
| Post-trade verification | `trade_proof`      | `verify_evidence`    | `verify_evidence`    |

## Minimal TypeScript example

```typescript
await client.callTool({
  name: 'trade_guard',
  arguments: {
    op: 'check_safety',
    action: 'perp_open',
    chain: 'hyperliquid',
    symbol: 'ETH',
    direction: 'open_short',
    sizeUsd: '8000',
    collateralUsd: '3000',
  },
});
```

## Boundary

Insight does not interact with the Hyperliquid API, open positions, or manage
margin. Every response carries `meta.insightDoesNotEnforce: true`.
