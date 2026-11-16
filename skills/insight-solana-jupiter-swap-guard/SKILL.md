---
name: insight-solana-jupiter-swap-guard
description: Prepare a reviewed Solana Jupiter route before an agent asks a user to sign. Use the unified trade_guard/prepare_swap surface with venue solana_jupiter; coverage is limited to reviewed route pools and Insight never signs, submits, relays, or authorizes.
---

# Insight — Solana Jupiter Swap Guard

Use the unified MCP `trade_guard` flow with `action: "swap"`,
`chain_id: "solana"`, and a nested guard containing the Jupiter route
parameters, or use `prepare_swap` with `venue: "solana_jupiter"`.

Insight obtains the Jupiter quote, checks the exact route plan against the
reviewed pool allowlist, compares the route economics with independent oracle
evidence, and only returns a buildable route for an approved, reviewed
coverage result. Unknown or unreviewed route pools fail closed as unavailable;
they are not silently treated as safe.

The result is not a wallet authorization. Preserve the quote, route plan,
risk-verdict reference, and returned unsigned transaction. Bind the exact
Solana transaction message with PriorSeal before requesting a signature.

Do not use this skill for arbitrary Jupiter routes, unsupported mints, route
bundles, or a route whose pool coverage changed after the check.
