# Bounded WAK P1 signed validity

The approved WAK Base Sepolia handoff may use a 900-second OracleSafetyCheck v3
validity interval. Enable `WAK_P1_SIGNED_TTL_SECONDS=900` in the production
server environment only after the reviewed main commit passes validation and
browser smoke and the partner confirms the new verifier.

For the user-approved one-time longer handoff, use
`WAK_P1_SIGNED_TTL_SECONDS=1800` together with
`WAK_P1_EXTENDED_VALIDITY_UNTIL=<10-digit Unix seconds>` in the production
server environment. The latter is an issuance cutoff, not an extension of a
signed artifact. The operator sets it to one hour after configuration and
restores the normal setting when this bounded run closes. If the cutoff is
missing, malformed or reached, the 1800 setting selects the default 600-second
path automatically. Every WAK scope condition below still applies.

The 1800-second signed interval gives a nominal 1620-second window to broadcast
cutoff and 1380 seconds from signed checkedAt to the local review floor. It
allows more age in the signed evidence, so this exception is limited to the
approved Base Sepolia fixture and this handoff. It does not change quote,
nonce, call-binding, fee, signature, floor or finality checks.

The exception requires all of: authenticated API key audit attribution,
workflow tag `wak.insight-priorseal.p1.v1`, schema 3, chain 84532, swap, declared
trade amount USD 4, and the standard Base Sepolia WETH/USDC CAIP-19 pair in either
direction. Other requests select the default 600-second interval. The operator
setting is not a query parameter. It does not authorize a transaction.

The v3 layout is unchanged. `data.checkedAt` and `data.validUntil` are both signed;
the selected deadline is computed before signing. The unsigned envelope's
`validForSeconds` and `validUntil` mirror the signed interval. Never extend old
signed evidence or only extend a PriorSeal authorization. Collect and sign a
new pair, create a new exact-call authorization/acceptance and regenerate every
transaction binding and manifest.

The run sheet may summarize expiry and `offChainValidity.insightValidUntil`.
The signed `checkedAt`/`validUntil` are in the original two Insight JSON files;
read those files when verifying the interval. A run-sheet field by itself is
not a signature. Compare all summarized times to the signed evidence.

Use the agreed 180-second margin: cutoff is the minimum signed evidence and
PriorSeal expiry minus 180 seconds. The operator final-review floor is 240
seconds remaining; WAK's hard receiver pre-sign floor is 120 seconds remaining.
These are checks on time remaining, not durations to add together. Review the
actual end-to-end timing and never promise that a floor alone guarantees GO.

All gas and fee fields are raw wei from the fresh sheet. For example,
7,000,000 wei is 0.007 gwei, not 7 gwei. Never convert a display label back into
transaction fields. On expiry or a bound-value change, abort and regenerate
completely, with a new explicit GO.

Retain attempted and successful boundary counts separately, the receipt timeout
of 180 seconds, two-confirmation canonical finality, and successful-run counts
1/1/1/1. Nonce unchanged alone does not prove no offline signing or broadcast.
Disabling the server setting restores the default issuance path on a subsequent
approved deployment; previously signed artifacts keep their original deadline.
