---
name: insight-solana-perp-guard
description: Assess a proposed Drift Protocol v2 perpetual position on Solana mainnet before the agent or wallet acts. The skill checks underlying and USDC oracle integrity, caller-declared post-action leverage against a reviewed cap validated by the live Drift margin ratio, and disclosed on-chain venue evidence (Drift mark price vs Pyth Lazer oracle deviation, funding rate, open interest, market status), returning an ALLOW / CAUTION / BLOCK decision. Use only for reviewed Drift v2 open-position intents (SOL, BTC, ETH today, USDC margin); never for generic swaps, order building, or transaction execution.
---

# Insight Solana Perp Guard

This is the focused decision-input Skill for the Solana perpetual-futures
scenario: one Drift Protocol v2 open-position intent on Solana mainnet.

1. Collect the caller's declared post-action values: `protocolId`
   (`drift-v2-mainnet`), market underlying symbol (`SOL`, `BTC`, or `ETH`),
   direction (`open_long` or `open_short`), notional `sizeUsd`, and USDC
   `marginValueUsd`, all after the intended action.
2. Call `solana_perp_guard` with those values. Effective leverage is derived,
   not declared.
3. Treat `BLOCK` as stop. Treat `CAUTION` as review-before-execution. Treat an
   `ALLOW` as decision evidence only — never as wallet authority or an order
   authorization.
4. Bind a successful result to an exact, user-authorized order separately
   (for example through PriorSeal) before any execution step.

Every assessment reads live Drift PerpMarket and Pyth Lazer oracle accounts
from Solana mainnet RPC. If the on-chain venue state cannot be observed, the
result discloses that instead of inventing values, and a missing oracle
deviation fails closed. Markets outside the reviewed set (SOL, BTC, ETH, USDC
margin) fail closed by design.

Do not create an order, request a signature, retry a blocked intent with
altered fields, or claim support for the liquidation engine or cross-margin
portfolio assessment. Insight never accepts or holds a Solana private key,
mnemonic, or signature.

See [`README.md`](README.md) for installation and exact boundaries.
