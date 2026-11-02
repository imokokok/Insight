---
name: insight-base-perp-guard
description: Assess a proposed Synthetix Perps V3 position on Base before the agent or wallet acts. The skill checks underlying and USDC margin oracle integrity plus caller-declared post-action leverage against reviewed market caps, returns an ALLOW / CAUTION / BLOCK decision, and can bind one exact unsigned commitOrder call into a portable EIP-712 decision. Use only for Synthetix Perps V3 Base open-position intents; never for generic swaps, venue-internal order building, or transaction execution.
---

# Insight Base Perp Guard

This is the focused decision-input Skill for the Base perpetual-futures scenario:
one Synthetix Perps V3 Base open-position intent.

1. Collect the caller's declared post-action values: market underlying symbol,
   direction (`open_long` or `open_short`), notional `sizeUsd`, and USDC
   `marginValueUsd`, all after the intended action.
2. Call `base_perp_guard` with those values. Effective leverage is derived, not
   declared.
3. Treat `BLOCK` as stop. Treat `CAUTION` as review-before-execution. Treat an
   `ALLOW` as decision evidence only — never as wallet authority or an order
   authorization.
4. Bind a successful result to an exact, user-authorized order separately (for
   example through PriorSeal) before any execution step.

For portable evidence, use `base_perp_guard_exact_call`: pass the same guard
values plus one unsigned direct PerpsMarketProxy `commitOrder` transaction
(`chainId`, `from`, `to`, `data`, `nonce`, `value`). The decoder verifies the
canonical proxy target, reviewed market id, Pyth settlement strategy, sizeDelta
direction, no tracking code or referrer, sender, nonce, and zero value, then
returns a short-lived EIP-712 decision when Insight signing is configured. The
exact-call response still is not an execution authorization, and margin must
already be deposited into the Synthetix account separately.

Do not create an order, request a signature, retry a blocked intent with
altered fields, or claim support for mark-price, funding, or liquidation-engine
assessment. Markets outside the reviewed set (BTC, ETH, SOL, XRP, DOGE, PEPE)
fail closed by design.

See [`README.md`](README.md) for installation and exact boundaries.
