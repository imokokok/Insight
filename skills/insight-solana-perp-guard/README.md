# Insight Solana Perp Guard skill

Pre-trade safety gate for perpetual orders on a covered Solana mainnet protocol
with canonical mainnet feed checks.

## Tool mapping

| What you want to do | Canonical MCP tool | `op` selector | Deprecated alias |
|---|---|---|---|
| Pre-perp safety gate | `trade_guard` | `check_safety` | `check_trade_safety` |
| Prepare a perp order | `trade_guard` | `prepare_perp_order` | `prepare_perp_order` |
| Post-trade verification | `trade_proof` | `verify_evidence` | `verify_evidence` |

## Minimal TypeScript example

```typescript
await client.callTool({
  name: 'trade_guard',
  arguments: {
    op: 'check_safety',
    action: 'perp_open',
    chain: 'solana',
    symbol: 'SOL',
    direction: 'open_long',
    sizeUsd: '3000',
    collateralUsd: '1500',
  },
});
```

## Boundary

Insight does not submit Solana transactions or interact with any perp protocol
API directly. Every response carries `meta.insightDoesNotEnforce: true`.
