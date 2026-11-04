---
name: insight-hyperliquid-perp-guard
description: Assess a proposed Hyperliquid HyperCore perpetual position before the agent or wallet acts. The skill checks underlying and USDC oracle integrity, caller-declared post-action leverage against a reviewed cap validated by the live venue leverage limit, and disclosed venue evidence (mark/oracle divergence, consensus-vs-venue deviation, displayed depth), returning an ALLOW / CAUTION / BLOCK decision, and can bind one exact unsigned IOC order envelope into a portable EIP-712 decision. Use only for reviewed Hyperliquid open-position intents (BTC, ETH today); never for generic swaps, venue-internal order building, or transaction execution.
---

# Insight Hyperliquid Perp Guard

This is the focused decision-input Skill for the Hyperliquid perpetual-futures
scenario: one Hyperliquid HyperCore open-position intent.

1. Collect the caller's declared post-action values: `protocolId`
   (`hyperliquid-perps-mainnet`), market underlying symbol, direction
   (`open_long` or `open_short`), notional `sizeUsd`, and USDC
   `marginValueUsd`, all after the intended action.
2. Call `hyperliquid_perp_guard` with those values. Effective leverage is
   derived, not declared.
3. Treat `BLOCK` as stop. Treat `CAUTION` as review-before-execution. Treat an
   `ALLOW` as decision evidence only — never as wallet authority or an order
   authorization.
4. Bind a successful result to an exact, user-authorized order separately (for
   example through PriorSeal) before any execution step.

For portable evidence, use `hyperliquid_perp_guard_exact_call`: pass the same
guard values plus one unsigned Hyperliquid IOC order envelope. The validator
checks that the envelope is a single order on the reviewed market, its side
matches the assessed action, its notional is within the reviewed tolerance of
the declared size, its window is unexpired, and its builder fee is within the
venue cap, then returns a short-lived EIP-712 decision over the envelope intent
hash when Insight signing is configured. The exact-call response still is not
an execution authorization, and the envelope must be signed in the account
owner's own wallet or approved API-wallet process exactly as bound.

Do not create an order, request a signature, retry a blocked intent with
altered fields, or claim support for the liquidation engine or cross-margin
portfolio assessment. Markets outside the reviewed set (BTC, ETH, USDC margin)
fail closed by design. Insight never accepts or holds a Hyperliquid API key,
private key, nonce, or signature.

See [`README.md`](README.md) for installation and exact boundaries.
