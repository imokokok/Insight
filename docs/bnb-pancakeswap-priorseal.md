# BNB PancakeSwap V3 + Insight + PriorSeal

This integration packages the existing BNB PancakeSwap V3 guard for agent
distribution. It is not a new router or a general-purpose transaction risk
score.

## Supported profiles

| Profile                            | Chain                  | Pair        | Call shape                    |
| ---------------------------------- | ---------------------- | ----------- | ----------------------------- |
| `bnb-pancakeswap-v3-usdt-usdc-100` | BNB Smart Chain (`56`) | USDT ↔ USDC | fixed-pool `exactInputSingle` |
| `bnb-pancakeswap-v3-usdt-wbnb-100` | BNB Smart Chain (`56`) | USDT ↔ WBNB | fixed-pool `exactInputSingle` |

The semantic MCP entrypoint is `prepare_bnb_pancakeswap_v3_guard`. The older
`prepare_base_agent_swap_guard` name remains available for compatibility and
also serves the BNB profiles when called with an explicit BNB `profileId`.

## Safety boundary

The guard returns unsigned calldata only. It does not custody keys, sign,
broadcast, route through an aggregator, or guarantee a fill or token value.
Approval and swap are separate calls. PriorSeal must bind the exact bytes and
the executor must observe a successful approval before submitting the swap.

For the complete binding and evidence flow, use the [PriorSeal BNB reference
example](https://github.com/imokokok/PriorSeal/tree/main/examples/bnb-pancakeswap-priorseal-v1).
