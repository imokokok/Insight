---
name: insight-solana-swap-guard
description: Gate a narrowly reviewed Solana swap before an agent asks a user to sign. Use for exactly one unsigned Orca Whirlpool USDC/USDT 0.01% swap on Solana mainnet (either direction), when the agent needs an exact price-integrity decision bound to the full unsigned transaction message. Invoke before a wallet prompt, not after. Returns ALLOW / CAUTION / BLOCK; only an attested ALLOW carries a decision, and Insight never signs, submits, relays, or authorizes.
---

# Insight — Solana Swap Guard

Use `solana_swap_guard` only after the agent has fully resolved one exact
unsigned Orca Whirlpool USDC/USDT swap message: the reviewed 0.01% pool,
exactly one legacy Whirlpool swap instruction (no swapV2, no aggregators, no
bundles), explicit amounts, and the minimum output the user accepted.

The declared decision prices are evidence of the agent's decision, not trusted
pricing inputs. The guard independently re-verifies the pool, vaults, tick
array, oracle, and both user token accounts from live mainnet state, prices
the pool from its own sqrtPrice against independent oracle consensus, and
simulates the exact unsigned message. Do not modify any account, amount,
threshold, or instruction after a result.

Do not use this tool for an aggregated or routed swap, a versioned-token
mismatch, an arbitrary instruction bundle, or a transaction with more than one
swap instruction. Those messages are not covered by this skill. Do not
substitute another pool or route after a result.

When the result is:

- `ALLOW` with an attestation: show the signed decision, the exact unsigned
  message, and its `decisionHash` to the user. Bind an identical message and
  the decision hash to a separate user authorization (PriorSeal) before
  requesting a signature. The ALLOW attestation is bound to the exact message
  hash and is short-lived; re-assess after expiry.
- `ALLOW` without an attestation: do not request a signature. The result has
  no trusted Insight binding; obtain a fresh assessment.
- `CAUTION`: do not ask for a signature or submit anything. Explain the
  warning and create a new assessment only for a changed proposal.
- `BLOCK`: stop. Do not retry a different pool or route simply to evade the
  block.

After the transaction is executed by a wallet outside Insight, preserve the
signed decision and the on-chain transaction signature and call
`settle_solana_swap_guard` for a signed SETTLED / REVERTED / UNRECONCILED
closure. Third parties can re-verify the settlement with
`verify_solana_swap_guard_settlement`.

Insight does not custody funds, hold a signing key, choose a pool, submit a
transaction, or guarantee a fill.

Read the full operational boundary in [README.md](README.md).
