---
name: insight-bnb-pancakeswap-guard
description: |
  Use before an agent asks a user to sign a reviewed PancakeSwap V3 swap on
  BNB Smart Chain. Supports only the reviewed USDT/USDC and USDT/WBNB
  single-pool direct-call profiles. Returns ALLOW, CAUTION, or BLOCK; only
  ALLOW returns exact unsigned approval and swap calldata. Bind both calls to
  separate PriorSeal exact-call authorizations before execution.
version: 0.1.0
license: MIT
---

# Insight BNB PancakeSwap V3 Guard

Call `prepare_bnb_pancakeswap_v3_guard` before any wallet prompt for these
reviewed profiles:

- `bnb-pancakeswap-v3-usdt-usdc-100`
- `bnb-pancakeswap-v3-usdt-wbnb-100`

The guard rechecks the pinned pool, router, factory and quoter identities,
obtains a fresh quote, applies price/TWAP/reference/slippage policy, and
canonical-decodes the exact `approve` and `exactInputSingle` calldata. It does
not choose an arbitrary route, sign, broadcast, relay or authorize a
transaction.

If the result is `ALLOW`:

1. Show the user the token, router, recipient, amount, minimum output,
   deadline, quote block and decision hash.
2. Create two PriorSeal exact-call authorizations from the byte-identical
   calls: approval at nonce `N`, swap at nonce `N + 1`.
3. Obtain the user's signature for each call separately.
4. Observe the approval before submitting the swap.
5. Preserve both PriorSeal receipts and the Insight decision for review.

`CAUTION` and `BLOCK` return no calldata to sign. Do not retry with a different
route to evade the result. See the [BNB PancakeSwap integration guide](../../docs/bnb-pancakeswap-priorseal.md).
