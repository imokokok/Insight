# Insight Lending Guard — Base Aave V3 direct calls

This focused Skill is intentionally narrower than a general "DeFi safety" tool.
It evaluates one exact, unsigned Base mainnet direct Aave V3 `supply` or
variable-rate `borrow` call before any wallet signature.

## Tool mapping

This Skill wraps `trade_guard` with lending-specific parameter defaults. Call
the canonical product tool directly, or use the deprecated alias
`check_trade_safety` (sunset 2027-01-06).

| What you want to do | Canonical MCP tool | `op` selector | Deprecated alias |
|---|---|---|---|
| Pre-lending safety gate | `trade_guard` | `check_safety` | `check_trade_safety` |
| Decode + verify an exact unsigned transaction | `trade_guard` | `check_safety` (with calldata) | `base_lending_guard_exact_call` (conceptual; resolves to `check_safety`) |
| Post-trade evidence verify | `trade_proof` | `verify_evidence` | `verify_evidence` |

Install the remote endpoint with [`mcp.json`](mcp.json), then use the
no-money discovery check from the companion
[`insight-pre-trade-safety` Skill](../insight-pre-trade-safety/examples/connection-check.mts).

## Minimal TypeScript example

```typescript
// Base Aave V3 supply exact-call safety gate
await client.callTool({
  name: 'trade_guard',
  arguments: {
    op: 'check_safety',
    action: 'lend',
    chain: 'base',
    symbol: 'USDC',
    amount: '5000',
    transaction: {
      chainId: 8453,
      from: '0x...wallet...',
      to: '0x...pool...',
      data: '0x...supply calldata...',
      nonce: 7,
      value: '0',
    },
  },
});
// Returns PASS / CAUTION / DANGER / BLOCK + risk inputs
```

## Boundary

An Insight `ALLOW` is not a signature request and cannot move funds. To turn an
attested `ALLOW` into a bounded, user-authorized action with later evidence,
use [PriorSeal's Guarded Action integration](https://github.com/imokokok/PriorSeal/blob/main/docs/integrations/guarded-action.md).

Insight does not custody funds, sign, broadcast, or guarantee an outcome.
Every response carries `meta.insightDoesNotEnforce: true`.
