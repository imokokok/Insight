# Coverage readiness and SLO v1

## Decision

Keep the existing pre-trade v1/v2/v3 and partner policies unchanged. Add an
explicit, opt-in coverage readiness contract. Coverage PASS means enough recent,
classified, mutually consistent oracle evidence for this asset and evidence
chain. It does not mean trade safety, settlement-chain coverage, or permission
to execute. Existing safety checks and principal authorization remain required.

The implementation uses a pinned content-addressed policy and a separate
`Insight Coverage` EIP-712 domain. Reports commit all observations, scope,
policy, evaluation time and expiry. Consumers pin the policy and trusted signer
with validity/revocation bounds independently of the response. Unknown providers
never create independent groups. Operator grouping is a reviewed classification,
not proof of independent upstream data.

## Delivery plan and acceptance

1. Shared deterministic evaluator and offline verifier in the Insight SDK:
   deduplicate providers, reject unknown classification, stale/unknown/future
   timestamps, failed/outlier responses and cross-chain observations; recompute
   freshness as time advances; check quorum, non-derived groups and dispersion.
2. Authenticated live assessment and policy discovery endpoints, SDK client,
   and a guard that validates immediately before calling the consumer action.
   A missing signer returns unsigned evidence, never a usable proof.
3. PriorSeal SDK composition helper: independently verify the same report,
   bind its digest in an exact-call intent, cap authorization expiry to report
   expiry, and recheck before provider entry. The core receipt remains opaque
   to external evidence; no partner is silently activated.
4. Durable scheduled sampling, append-only slots and bounded SQL aggregation.
   Missing slots and failed probes stay in the denominator. Separate data
   readiness from signed-report readiness. Report 24h/7d/28d windows, error
   budget and measurement gaps in authenticated Ops and read-only API.
5. Regression, tampering, expiry, isolation, lost-slot and SQL tests; promotion
   record; deployment and incident runbook. Preserve unrelated working changes.

## Initial profile

`strict-300s.v1`: at least 3 eligible providers, 2 known non-derived operator
groups, source age <=300 seconds, spread <=100 bps relative to median, report
TTL <=60 seconds and bounded by the earliest included source expiry. These are
explicit profile settings, not a universal claim that all assets support them.
The source map is pinned in policy bytes; changes require a new policy hash.
Cross-chain candidate observations cannot satisfy the profile.

## Measurement

One sample per enrolled asset/chain/policy per 15-minute UTC slot. Count complete
slots only, from enrollment onward. The first recorded result wins, so retries
cannot rewrite outages as success. Current-slot writes cannot backfill historical
slots. A missing sample is unknown/unavailable, never PASS. Store source reasons
and the report for diagnosis. Use an internal 99% objective initially; this is a
planning target, not an external SLA or evidence of achieved reliability.

Good slots / expected slots follows the event-ratio method in
[Google SRE's SLO workbook](https://sre.google/workbook/implementing-slos/).
15-minute sampling cannot measure continuous uptime or detect every short outage.
An SLO miss does not block a currently valid report; live checks govern actions.

## Release boundary

Implement locally and validate end-to-end using deterministic signed fixtures.
Production needs the additive migration, dedicated coverage signing key,
independently distributed trust configuration, deployed API and enabled collector.
Never provision or print secrets from tests; never execute a funded transaction
as part of acceptance. Existing immutable partner records remain untouched.
