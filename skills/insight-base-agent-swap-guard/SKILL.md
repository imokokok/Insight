---
name: insight-base-agent-swap-guard
description: Gate a narrowly reviewed Base swap before an agent asks a user to sign. Use for Aerodrome Slipstream WETH→USDC or PancakeSwap V3 USDC→USDT direct swaps on Base, when the agent needs an exact quote/code/price-integrity decision bound to unsigned calls. Invoke before a wallet prompt, not after. Returns ALLOW / CAUTION / BLOCK; only ALLOW includes calls, and Insight never signs, routes, broadcasts, or authorizes.
---

# Insight — Base Agent Swap Guard

Use `prepare_base_agent_swap_guard` only after the agent has selected one of
the two reviewed direct Base paths. Supply the exact amount, recipient, short
deadline, the USD prices the agent used for both route assets, and explicit
policy limits.

The declared prices are evidence of the agent's decision, not trusted pricing
inputs. The guard independently checks each against oracle consensus and uses
the independently checked destination consensus to convert the exact DEX quote
to USD. It also canonical-decodes both returned calldata blobs; do not modify
their bytes, token, spender, router, recipient, deadline, amount, minimum
output, or venue parameter after a result.

Do not use this tool for an aggregator transaction, an arbitrary multicall,
native ETH, a reverse route, permit flow, or a Base Account UserOperation.
Those calls are not covered by this skill. Do not substitute another route
after a result.

When the result is:

- `ALLOW`: show the exact approval and swap calls, minimum output, deadline,
  and `decisionHash` to the user. Bind identical calls and the decision hash to
  a separate user authorization before requesting confirmation.
- `CAUTION`: do not ask for a signature or submit a transaction. Explain the
  warning and create a new assessment only for a changed proposal.
- `BLOCK`: stop. Do not retry a route simply to evade the block.

Insight does not custody funds, hold a signing key, choose a route, submit a
transaction, or guarantee a fill. Use `execution_receipt` only after a wallet
outside Insight has broadcast a user-authorized Base transaction.

Read the full operational boundary in [README.md](README.md).
