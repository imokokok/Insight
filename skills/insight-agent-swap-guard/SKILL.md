---
name: insight-agent-swap-guard
description: Gate a reviewed EVM swap before an agent asks a user to sign. Use the neutral prepare_agent_swap_guard tool for the reviewed direct Base, BNB Smart Chain, and Monad profiles; use execution_preflight for Uniswap or 1inch route evidence only when the route quote is supplied. Insight never signs, routes, relays, or broadcasts.
---

# Insight — Agent Swap Guard

Use `prepare_agent_swap_guard` for one of the reviewed direct-router profiles.
The tool checks the declared decision prices, a pinned venue quote, oracle
consensus, price impact, TWAP, slippage, reviewed contract identities, and the
exact unsigned approval and swap calldata.

The current direct profiles are:

- Base: Aerodrome Slipstream and PancakeSwap V3 reviewed pools.
- BNB Smart Chain: PancakeSwap V3 USDT/USDC and USDT/WBNB profiles.
- Monad: PancakeSwap V3 WMON/USDC profile.

For `ALLOW`, preserve the exact returned calls and `decisionHash`. Bind those
bytes through PriorSeal before requesting a wallet signature. After execution,
call `settle_agent_swap_guard`; third parties can use
`verify_agent_swap_guard_settlement`.

Do not use this tool for Uniswap API, 1inch, CoW, arbitrary aggregator,
multicall, Permit2, native-value, smart-account UserOperation, or unknown
router calldata. Those routes are outside the reviewed direct-router scope.
For an aggregator route, use `execution_preflight` only as a data-sufficiency
check with a fresh route quote and explicit policy; that result is not contract
or route safety evidence. Bind the exact transaction separately with PriorSeal.

`prepare_base_agent_swap_guard`, `settle_base_agent_swap_guard`, and
`verify_base_agent_swap_guard_settlement` remain compatibility aliases for old
clients. New integrations should use the neutral names.

Insight does not custody funds, hold a signing key, choose a route, submit a
transaction, or guarantee a fill.
