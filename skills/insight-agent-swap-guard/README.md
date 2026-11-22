# Insight Agent Swap Guard

Pre-trade safety for EVM agent-directed exact-route swaps. Covers reviewed
direct-router profiles; aggregator routes go through the generic pre-trade
safety Skill.

## Tool mapping

| What you want to do                | Canonical MCP tool | `op` selector     | Deprecated alias     |
| ---------------------------------- | ------------------ | ----------------- | -------------------- |
| Pre-swap safety gate               | `trade_guard`      | `check_safety`    | `check_trade_safety` |
| Prepare an exact swap call         | `trade_guard`      | `prepare_swap`    | `prepare_swap`       |
| Post-trade settlement verification | `trade_proof`      | `verify_evidence` | `verify_evidence`    |

## Minimal TypeScript example

```typescript
await client.callTool({
  name: 'trade_guard',
  arguments: {
    op: 'prepare_swap',
    chain: 'base',
    from: 'USDC',
    to: 'WETH',
    amount: '1000',
    venue: 'uniswap_v3',
  },
});
// Returns unsigned tx blob + safety verdict + receipt request
```

## Boundary

Insight never signs or broadcasts the prepared transaction. Every response
carries `meta.insightDoesNotEnforce: true`.
