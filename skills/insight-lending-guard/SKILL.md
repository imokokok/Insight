---
name: insight-lending-guard
description: Assess one unsigned, direct Base Aave V3 lending call before a wallet signature. The skill checks collateral and debt oracle integrity plus caller-declared post-action LTV, then returns a signed five-minute decision when the Insight attester is configured. Use only for direct Base Aave V3 supply or variable-rate borrow calls; never for generic swaps, batches, approvals plus swaps, smart accounts, or transaction execution.
---

# Insight Lending Guard

This is the focused decision-input Skill for the first commercial beachhead:
one exact Base mainnet Aave V3 direct EOA call.

1. Require an unsigned transaction with `chainId: 8453`, the canonical Aave V3
   Pool target, zero value, a direct `supply` or variable-rate `borrow`
   selector, sender, and nonce.
2. Call `base_lending_guard_exact_call` with that transaction plus declared
   post-action collateral/debt values.
3. Treat an un-attested result as preview only. Treat `BLOCK` as stop. Treat an
   attested `ALLOW` as decision evidence only—not wallet authority.
4. Hand an attested `ALLOW` to PriorSeal's
   `buildBaseLendingGuardBoundIntent()` path for a separately reviewed,
   time-bounded authorization and later execution receipt.

Do not create a transaction, request a wallet signature, retry a blocked call
with altered fields, or claim support for a generic Wallet MCP swap, multi-call,
Permit2, UserOperation, or ERC-1271 signature.

See [`README.md`](README.md) for installation and exact boundaries.
