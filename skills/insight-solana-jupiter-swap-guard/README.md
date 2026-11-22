# Insight Solana Jupiter Swap Guard

Reviewed Solana Jupiter route guard for agent-directed swaps using the
aggregator's direct-router profiles.

## Tool mapping

| What you want to do            | Canonical MCP tool | `op` selector     | Deprecated alias     |
| ------------------------------ | ------------------ | ----------------- | -------------------- |
| Pre-swap safety gate           | `trade_guard`      | `check_safety`    | `check_trade_safety` |
| Prepare a Jupiter swap message | `trade_guard`      | `prepare_swap`    | `prepare_swap`       |
| Post-trade verification        | `trade_proof`      | `verify_evidence` | `verify_evidence`    |

## Minimal TypeScript example

```typescript
await client.callTool({
  name: 'trade_guard',
  arguments: {
    op: 'prepare_swap',
    chain: 'solana',
    from: 'USDC',
    to: 'SOL',
    amount: '500',
    venue: 'solana_jupiter',
  },
});
```

## Boundary

Coverage is limited to reviewed route pools. Insight never signs, submits,
relays, or authorizes. Every response carries `meta.insightDoesNotEnforce: true`.
