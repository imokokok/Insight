# Insight Base Agent Swap Guard

This Agent Skill gives a Base trading agent one narrow, safe workflow: assess a
reviewed direct swap before showing a wallet-signing request.

## Quick install

1. Add the remote server in [`mcp.json`](mcp.json) to an MCP-compatible host.
2. Discover tools with `initialize` and `tools/list` before configuring an API
   key or x402 wallet.
3. Keep credentials and payment keys in the host's secret manager only.
4. Ask the Agent to use `prepare_base_agent_swap_guard` before any Base wallet
   prompt for a supported profile.

## Current scope

- Aerodrome Slipstream WETH → USDC, one reviewed Base CL100 pool.
- PancakeSwap V3 USDC → USDT, one reviewed Base 0.01% pool.
- Exact input, direct router calls only; approval and swap calls are unsigned.
- The agent's two price assumptions are checked against independent consensus;
  destination consensus, rather than the agent's destination assumption,
  converts the exact DEX quote to USD.
- Before an `ALLOW`, Insight canonical-decodes the ERC-20 approval and
  venue-specific single-hop swap bytes and binds their semantic fields to the
  reviewed profile.

The skill returns no calldata for `CAUTION` or `BLOCK`. `ALLOW` still requires
an independent user authorization and explicit wallet confirmation. It does
not cover Base Account UserOperations, 0x/1inch/Kyber routes, arbitrary
multicalls, permits, native-value swaps, MEV, token-contract safety, or fill
guarantees.

For the full policy contract, response semantics, and PriorSeal handoff, read
the repository [Base Agent Swap Guard guide](../../docs/base-agent-swap-guard.md).
