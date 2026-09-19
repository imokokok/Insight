# Changelog

## 0.3.0 — 2026-09-19

- Add assessment diagnostics that distinguish market findings, missing evidence, unavailable scope, freshness, budget, and service failures while preserving the original verdict and proof.
- Add freshness profiles, typed rechecks, and assessment refresh. Honor both proofs' earliest expiry and recheck immediately before signing and submission.
- Reject known expired or invalid assessment time windows even without a custom profile. An explicitly requested but unevaluated dimension cannot inherit a generic PASS.
- Add durable Watch state, incident deduplication, monitor-unavailable states, consecutive recovery samples, and explicit recovery acknowledgement. Retired Watch instances cannot override the current gate or durable state.
- Add success-response cost metadata and a workflow budget estimator without automatic recharge or fund execution.
- Add transaction-bound evidence checkpoints, missing-artifact recovery, existing-job polling, and original proof attachments for portable review manifests. Terminal observation jobs report missing evidence instead of remaining pending indefinitely.
- Label service-derived verification explicitly; these reports do not claim independent local signature verification.

The API verdicts and signed proof formats remain unchanged. Safety behavior is stricter for known expired evidence and explicitly unavailable scope. Healthy Watch samples no longer clear an incident automatically; review and acknowledge recovery explicitly.
