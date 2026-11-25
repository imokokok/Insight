# Insight Base Perp Guard skill

Read-only pre-trade safety gate for Synthetix Perps V3 on Base mainnet, with
double underlying and USDC cross-oracle consensus integrity checks.

## Tool mapping

| What you want to do              | Canonical MCP tool | `op` selector        | Deprecated alias     |
| -------------------------------- | ------------------ | -------------------- | -------------------- |
| Pre-perp safety gate             | `trade_guard`      | `check_safety`       | `check_trade_safety` |
| Prepare a perp order             | `trade_guard`      | `prepare_perp_order` | `prepare_perp_order` |
| Post-trade evidence verification | `trade_proof`      | `verify_evidence`    | `verify_evidence`    |

Effective leverage is derived, not input — declare direction (`open_long` or
`open_short`), notional `sizeUsd`, and USDC collateral available.

## Minimal TypeScript example

```typescript
await client.callTool({
  name: 'trade_guard',
  arguments: {
    op: 'check_safety',
    action: 'perp_open',
    chain_id: 8453,
    symbol: 'BTC',
    direction: 'open_long',
    sizeUsd: '5000',
    collateralUsd: '2000',
  },
});
// Returns PASS / CAUTION / DANGER / BLOCK + derived leverage and oracle integrity
```

Exact-call variant (binds unsigned `commitOrder` transaction to market id,
settlement strategy 0, direction-matching sizeDelta):

```typescript
await client.callTool({
  name: 'trade_guard',
  arguments: {
    op: 'check_safety',
    action: 'perp_open',
    chain_id: 8453,
    symbol: 'BTC',
    transaction: {
      chainId: 8453,
      from: '0x...',
      to: '0x...market...',
      data: '0x...commitOrder calldata...',
      nonce: 3,
      value: '0',
    },
  },
});
```

## Boundary

Margin must already be in the Synthetix account. Insight returns a five-minute
signed decision that is evidence, not execution authority. Every response
carries `meta.insightDoesNotEnforce: true`.
