# Agent Swap channel adapters

The distribution model is one reviewed evidence core with thin channel
adapters. A channel adapter may rename an entrypoint, translate a provider's
request shape, or present an existing decision in a wallet UI. It must not
expand the reviewed route scope without a new profile, tests, and settlement
evidence.

| Channel                   | Current integration surface                                                                                   | What we can distribute now                                              | What still requires a new review                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| PancakeSwap / BNB         | `prepare_bnb_pancakeswap_v3_guard`                                                                            | Direct BNB profiles and PriorSeal exact-call handoff                    | More pools or router modes                                         |
| Uniswap                   | `execution_preflight` for external route evidence; direct reviewed profiles only through the Agent Swap Guard | Integration guide and exact-transaction handoff                         | Universal Router, Permit2, UniswapX, and route-specific settlement |
| 1inch                     | `execution_preflight` for external route evidence                                                             | Integration guide and exact-transaction handoff                         | Classic, Fusion, Fusion+ and resolver/order semantics              |
| MetaMask                  | Wallet presentation layer                                                                                     | Display Insight decision, expiry, exact-call hash, and PriorSeal status | A production Snap package and wallet review                        |
| CoW Protocol              | Order/hook boundary                                                                                           | Integration contract and explicit refusal rules                         | Typed order, hook, solver, and settlement binding                  |
| Jupiter                   | Unified `prepare_swap` / `trade_guard` with `venue: solana_jupiter`                                           | Dedicated Jupiter Skill package                                         | Additional route pools and Solana settlement coverage              |
| MCP Registry / Skills Hub | Existing remote MCP and package build                                                                         | Neutral Agent Swap Guard and Jupiter packages                           | Registry or marketplace approval for each new version              |

## Product boundary

The direct Agent Swap Guard verifies a reviewed direct-router call. It does
not become a universal aggregator scanner when a provider returns arbitrary
calldata. For Uniswap and 1inch, `execution_preflight` can evaluate supplied
decision-input and quote evidence, but the caller must still bind the exact
provider output through its authorization layer. A preflight `ALLOW` is not a
contract-safety or execution-authority claim.

For MetaMask, the intended integration is a confirmation surface: show
evidence already produced by Insight and PriorSeal. The wallet must not change
the guarded transaction or manufacture a second risk score.

For CoW, the order and hook objects are not interchangeable with a direct EVM
transaction. A future adapter needs its own typed-data and settlement model.

Jupiter is different because the repository already has a route guard. Its
dedicated Skill exposes the existing unified MCP entrypoint; it does not imply
coverage for every pool in Jupiter's route universe.

## Distribution checklist

1. Publish the neutral Skill and keep the old Base-named archive as a
   compatibility package.
2. Publish the Jupiter Skill separately so Solana agents can discover the
   route-specific boundary.
3. Link the Uniswap/1inch and wallet/CoW integration contract in partner
   outreach.
4. Measure entry-source attribution and signed retry conversion before adding
   another protocol-specific entrypoint.
