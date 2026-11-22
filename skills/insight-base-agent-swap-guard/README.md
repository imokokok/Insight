# Insight Base Agent Swap Guard

Base mainnet agent-directed exact-route swap guard with Base-specific canonical
router profiles.

## Tool mapping

| What you want to do              | Canonical MCP tool | `op` selector     | Deprecated alias     |
| -------------------------------- | ------------------ | ----------------- | -------------------- |
| Pre-swap safety gate             | `trade_guard`      | `check_safety`    | `check_trade_safety` |
| Prepare an exact Base swap call  | `trade_guard`      | `prepare_swap`    | `prepare_swap`       |
| Post-trade evidence verification | `trade_proof`      | `verify_evidence` | `verify_evidence`    |

## Minimal TypeScript example

```typescript
await client.callTool({
  name: 'trade_guard',
  arguments: {
    op: 'prepare_swap',
    chain_id: 8453,
    from: 'USDC',
    to: 'WETH',
    amount: '1000',
    venue: 'uniswap_v3',
  },
});
```

## Boundary

Insight canonical-decodes ERC-20 approval and exact swap calldata but does not
modify, resubmit, or broadcast. Every response carries `meta.insightDoesNotEnforce: true`.
