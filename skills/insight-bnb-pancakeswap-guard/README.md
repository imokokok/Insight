# Insight BNB PancakeSwap V3 Guard

BNB mainnet PancakeSwap V3 exact-route swap guard with canonical `approve` +
`exactInputSingle` calldata decoding.

## Tool mapping

| What you want to do | Canonical MCP tool | `op` selector | Deprecated alias |
|---|---|---|---|
| Pre-swap safety gate | `trade_guard` | `check_safety` | `check_trade_safety` |
| Prepare an exact PancakeSwap V3 swap | `trade_guard` | `prepare_swap` | `prepare_swap` |
| Post-trade verification | `trade_proof` | `verify_evidence` | `verify_evidence` |

## Minimal TypeScript example

```typescript
await client.callTool({
  name: 'trade_guard',
  arguments: {
    op: 'prepare_swap',
    chain: 'bnb',
    from: 'USDT',
    to: 'WBNB',
    amount: '1000',
    venue: 'pancakeswap_v3',
  },
});
```

## Boundary

Insight canonical-decodes `approve` and `exactInputSingle` calldata but does
not modify or resubmit. Every response carries `meta.insightDoesNotEnforce: true`.
