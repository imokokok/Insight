# Five-minute Insight Guarded Action demo

This demo shows the portfolio's narrow first product: an unsigned, direct Base
Aave V3 lending call. It never asks a viewer to sign or send a transaction.

1. **0:00–0:40 — start with the exact call.** Show an unsigned direct Base
   Aave V3 `supply` or variable-rate `borrow` envelope. State the boundary:
   no generic swap, batch, approval-plus-swap, smart account, or custody flow.
2. **0:40–1:50 — assess the decision inputs.** Use
   `base_lending_guard_exact_call` with the exact call and declared post-action
   collateral/debt. Point out verdict, price-source agreement, freshness, LTV,
   limits, direct-call target, calldata hash and five-minute attestation.
3. **1:50–2:30 — stop on BLOCK.** Show that `BLOCK` ends the flow; it is not a
   transient failure and is not retried with modified calldata.
4. **2:30–3:40 — make authority explicit.** For an attested `ALLOW`, show the
   same call in PriorSeal's `buildBaseLendingGuardBoundIntent()` integration.
   Explain that the wallet signs a bounded authorization, not a price verdict,
   and that a transaction is still a separate user-approved action.
5. **3:40–4:30 — show the execution boundary.** Use the `Guarded Action` card:
   `risk → prepared → authorization → submitted → observing → observed →
verified`. Highlight that `UNKNOWN` re-observes the original transaction
   hash and never retries submission.
6. **4:30–5:00 — prove portability.** Show the receipt verification path and
   recap the buyer value: fewer unauditable agent actions, a clear user consent
   boundary, and evidence a downstream reviewer can verify.

For a live testnet rehearsal, use the PriorSeal
[Base Sepolia runbook](https://github.com/imokokok/PriorSeal/blob/main/docs/runbooks/base-sepolia-guarded-action-rehearsal.md).
