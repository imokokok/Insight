# Workflow diagnostics and quality review

These additions do not change the signed v1/v2/v3 field layouts. Explanatory scope and coverage diagnostics are unsigned. A live coverage probe is not a signed assessment or permission to execute.

## Exact evidence-chain coverage

`GET /api/v1/coverage` retains its registry summary. Its `bySymbol` section aggregates chains and must not be used as a per-chain quorum.

For one workflow use:

```text
/api/v1/coverage?asset=USDC&chainId=1
/api/v1/coverage?asset=USDC&chainId=1&probe=true&maxSourceAgeSeconds=300
```

The first form reports candidate/registered providers without price fetches (`NOT_PROBED`). The explicit probe uses the same exact-chain provider resolver and bounded provider fetches as consensus. Each provider reports registration scope, response status, source group, derived status, consensus inclusion, original source timestamp, retrieval time and known source age. A successful response is distinct from fresh evidence. A missing timestamp does not meet a freshness budget; price agreement does not make an old timestamp fresh.

`status` reports evidence sufficiency; `freshnessStatus` separately reports the optional maximum-source-age condition. The required count remains 3 providers and 2 non-derived groups. Unknown positive chain IDs are rejected instead of falling back to cross-chain prices. Evidence-chain coverage does not claim settlement-chain coverage.

A registry failure returns HTTP 503 `REGISTRY_UNAVAILABLE`, without zero-coverage claims. Diagnostic probes are uncached and use the existing C2 metering; completed insufficient probes are still successful diagnostic calls. They may use the existing provider/database cache and retain the original age. “Live probe” means a current invocation of the price retrieval path, not a guarantee that every provider made a new upstream request.

## Pre-trade scope and advisory sizing

Every new pre-trade response includes:

- `assessmentScope.requestedDimensions`, `evaluatedDimensions`, and `unavailableDimensions` with explicit reasons.
- `assessmentScope.actionRiskDirection`, evidence chain, and whether the borrow-buffer rule applies. Protocol parameters can be unavailable because the protocol/asset is unknown, the protocol belongs to another chain, or parameters are invalid/unavailable.
- `providerPrices.*.timestamp`, `retrievedAt`, `timestampProvenance`, `freshnessKnown`, `timestampAnomaly`, and sanitized failure information. Retrieval time is not source update time. These explanation fields do not replace signed provider-observation verification.
- `sizingBasis`: the fixed USD baseline, oracle/protocol inputs, missing venue/account/route inputs, and `executionCapacityVerified: false`. `recommendedMaxPositionUsd` is an oracle-condition advisory cap, not a verified executable position size.

Only `borrow` applies the new-debt max-LTV buffer gate. `repay`, `lend`, `liquidate` and `swap` retain the common oracle coverage, independence, freshness and risk rules. This does not verify a wallet position, recipient, route, or execution authorization.

An unchanged general oracle verdict does not mean an unavailable protocol dimension passed. Strict consumers must inspect the requested scope (the SDK assessment flow does this). Old HTTP clients retain the legacy signed schema defaults; new callers should explicitly request schema 3.

`stablecoin_peg` is requested only for an input asset supported by the configured stablecoin monitor and is evaluated only when that specific coin has a successful finite snapshot. Empty results or successful snapshots for other coins leave it unavailable. These snapshots are the monitor's configured cross-chain market context, not a destination-token or venue-specific peg check. Existing market-wide depeg warnings remain part of the legacy risk rules.

## Capture the customer's baseline from the first run

The GET pre-trade and POST recheck routes accept optional unsigned audit metadata:

```text
workflowTag=treasury.swap
baselineVerdict=allow
baselineVersion=customer-policy-v7
```

`workflowTag` accepts 1–80 letters, numbers, `_`, `.`, `:`, `-`; baseline verdict is `allow`, `alert`, `block`, or `unknown`. A baseline version is required for inclusion in paired comparisons. These are caller-reported observations, not verified statements and not new signed intent fields. HTTP request ID and API-key ID provide attribution. Do not place secrets or personal data in tags.

## Ops review and export

`/ops/safety/workflows` is linked from the existing Safety page. It reuses the Ops-owner session allowlist for reads, append-only human reviews, and JSON exports. A route handler does not inherit layout authorization, so exports repeat the owner gate. Reports can be filtered by API-key ID, workflow, asset, evidence chain, action and model version for 1–90 days.

Reports preserve raw records, baseline/model/schema/label versions, human review history and limitations. Summary counts distinguish coverage/staleness-induced stops, market/protocol findings, overlapping vs incremental baseline findings, incomplete historical scope and unreviewed rows. Human labels never overwrite automated abnormal-market proxy labels. The latest human label is counted while earlier reviews remain in export history.

Reports are bounded to 1,000 recent matching checks and explicitly flag truncation against the database count. Narrow filters when truncated. Incomplete review-history exports fail explicitly. Service failures, missing audit writes and actual billing transactions are not in this assessment-only denominator; use existing usage/billing views for those facts. These descriptive samples cannot establish manipulation-detection accuracy or prevented losses.

## Rollout

Apply `supabase/migrations/0055_workflow_quality_reviews.sql` before deploying the audit writer and Ops pages. This is an additive migration with no invented historical labels. It also restricts the old `pre_trade_checks` SELECT policy to authenticated owners of the referenced API key; unattributed checks are operational records, not public history. Human review records are service-role-only and the application requires Ops-owner authorization. No production migration is performed by this source change.

After applying to a development database, check an attributed pre-trade record, a denied non-owner export, a saved human review, and a JSON export. Existing tests cover registry failures, exact-chain/quote resolution, unavailable scope, unchanged quorum for risk-reducing actions, unknown timestamps, report accounting and authorization order.

## Local validation performed (2026-09-19)

- Node 22: focused API/Ops regression tests passed (8 suites, 96 tests), followed by a final 63-test pre-trade suite covering missing target peg evidence and total source outages. The final repository Jest run passed 197 suites and 1,984 tests; one existing suite/test was skipped. TypeScript and ESLint checks passed.
- A temporary PGlite script applied the original pre-trade table migration and migration 0055 to an isolated PostgreSQL engine with minimal `auth.uid()` and role fixtures. It applied 0055 twice, checked the indexes and baseline/review/FK constraints, verified that an authenticated owner can read only their API-key rows (neither another owner's nor unattributed rows), and verified that the service role can append/read reviews but cannot update/delete them. No live database or production migration was used. This validates SQL and role behavior in the fixture, not the complete deployed Supabase environment.
- The production build completed with `next build --webpack`, including TypeScript and 128 prerendered pages. The homepage bundle budget passed at 304 KB gzip across 20 chunks. The default Turbopack attempt was blocked by the execution environment's local compiler-process port restriction; the official webpack path was used for build verification. Public fonts were fetched through the existing local proxy. Database URLs/keys and Sentry credentials were overridden with local placeholders/empty values for the build, so this validation output must not be deployed as a production configuration.

These checks establish local implementation behavior. They do not establish production availability, live source quorum, customer review quality, or measured business outcomes.
