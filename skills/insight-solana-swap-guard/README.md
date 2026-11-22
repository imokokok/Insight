# Insight Solana Swap Guard

Solana mainnet exact-route swap guard covering reviewed Raydium and Jupiter
direct pools.

## Tool mapping

| What you want to do | Canonical MCP tool | `op` selector | Deprecated alias |
|---|---|---|---|
| Pre-swap safety gate | `trade_guard` | `check_safety` | `check_trade_safety` |
| Prepare a Solana swap message | `trade_guard` | `prepare_swap` | `prepare_swap` |
| Post-trade settlement verification | `trade_proof` | `verify_evidence` | `verify_evidence` |

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
    venue: 'raydium',
  },
});
// Returns unsigned Solana message + safety verdict
```

## Boundary

Insight validates the swap context against oracle health but does not sign
Solana messages or submit transactions. Every response carries
`meta.insightDoesNotEnforce: true`.
