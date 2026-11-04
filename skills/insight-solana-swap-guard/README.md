# Insight Solana Swap Guard

This Agent Skill gives a Solana trading agent one narrow, safe workflow:
assess a reviewed exact Orca Whirlpool USDC/USDT swap before showing a
wallet-signing request, and close the loop with signed settlement evidence
after execution.

## Quick install

1. Add the remote server in [`mcp.json`](mcp.json) to an MCP-compatible host.
2. Discover tools with `initialize` and `tools/list` before configuring an API
   key or x402 wallet.
3. Keep credentials and payment keys in the host's secret manager only.
4. Ask the Agent to use `solana_swap_guard` before any Solana wallet prompt
   for a supported pool, and `settle_solana_swap_guard` after execution.

## Current scope

- Orca Whirlpool USDC/USDT, one reviewed Solana mainnet 0.01% pool
  (both directions).
- One exact unsigned message per call: exactly one legacy Whirlpool swap
  instruction, no swapV2, no aggregators, no bundles.
- The guard re-verifies the pool, vaults, tick array, oracle, and both user
  token accounts from live mainnet state, and prices the pool from its own
  sqrtPrice against independent oracle consensus.
- The agent's declared decision prices must be consistent with the declared
  minimum output; the message is simulated before any attestation.
- `ALLOW` attestations are bound to the exact unsigned message hash and are
  short-lived; `CAUTION` and `BLOCK` return no executable payload.
- After execution, `settle_solana_swap_guard` verifies the decision, binds the
  on-chain Ed25519 signature to the attested message, re-collects SPL balance
  deltas, and returns a signed SETTLED / REVERTED / UNRECONCILED closure.
  `verify_solana_swap_guard_settlement` re-verifies that closure offline.

The skill returns no signable payload for `CAUTION` or `BLOCK`. An attested
`ALLOW` still requires an independent user authorization and explicit wallet
confirmation. It does not cover aggregated routes, arbitrary instruction
bundles, versioned-token mismatches, MEV, token-contract safety, or fill
guarantees.

For the full policy contract and settlement semantics, read the repository
[Solana Swap Guard guide](../../docs/solana-swap-guard.md).
