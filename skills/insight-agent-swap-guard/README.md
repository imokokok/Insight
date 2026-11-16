# Insight Agent Swap Guard

This skill packages the neutral multichain Agent Swap Guard for MCP hosts and
agent runtimes.

## Quick install

1. Add [`mcp.json`](mcp.json) to an MCP-compatible host.
2. Discover the live catalog with `initialize` and `tools/list`.
3. Use `prepare_agent_swap_guard` before a wallet prompt for a reviewed direct
   profile.
4. Preserve the returned decision and exact calls; bind them with PriorSeal.
5. Use `settle_agent_swap_guard` after execution and verify the closure with
   `verify_agent_swap_guard_settlement`.

## Distribution adapters

Uniswap and 1inch are supported as integration targets, not as silently
accepted direct-router profiles. Their API or intent output must be treated as
an external route proposal. See
[`references/channel-adapters.md`](references/channel-adapters.md) for the
safe handoff pattern and the explicit unsupported cases.

The older Base-named skill remains available for clients that pin its archive.
This package is the preferred entry point for new integrations.
