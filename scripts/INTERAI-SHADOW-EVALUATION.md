# InterAI exact-swap offline shadow candidate

This is a **synthetic, offline candidate** for the 2026-10-01 InterAI discussion. It does not freeze a bilateral specification, call InterAI `/verify`, change Stage 2 or production policy, verify live signatures, sign a transaction, or broadcast one. It is not a claim about economic losses or InterAI's current decisions.

Run `npm run interai:shadow:fixed` to emit 30 reproducible fixed WETH/USDC cases and their separate shadow outcomes. The reviewable output is committed as [interai-shadow-fixed-report.v1.json](interai-shadow-fixed-report.v1.json) and checked against the runner. The program records the current InterAI outcome as `null` because no authenticated current decision or agreed current-policy replay exists for these synthetic cases. An actual paired comparison requires InterAI's recorded outcomes or an agreed offline replay, plus mutually reviewed case labels, comparable chain/venue/pool observations, and independent verification/binding of any real signed facts.

The candidate uses seven case labels from Alejandro's email: `CLEAN_FRESH_BOUND`, `STALE_EVIDENCE`, `STALE_QUOTE`, `PROVIDER_DIVERGENCE`, `EVIDENCE_MISSING_OR_UNBOUND`, `INTENT_MARKET_MISMATCH`, and `BENIGN_NEAR_THRESHOLD`. It has 20 clean/benign controls and 10 constructed escalation cases. Two stale-quote cases are deliberately economically unsafe because the evidence-adjusted output is below the fixed minimum; the other eight require review for evidence age, disagreement, unusable evidence or intent mismatch. All values and market identifiers are explicitly synthetic. The JSON report includes both complete case inputs and separate outcome records.

Proposed endpoint convention for reproducible review:

| Measure                                         |    Clean or fresh | Near threshold | Stale or material |
| ----------------------------------------------- | ----------------: | -------------: | ----------------: |
| Evidence age and quote age, measured separately | `0–15s` inclusive |      `>15–30s` |            `>30s` |
| Cross-provider spread                           |         `<25 bps` |    `25–50 bps` |         `>50 bps` |
| Quote/reference drift                           |         `≤25 bps` |   `>25–50 bps` |         `>50 bps` |

These are evaluation bins, **not InterAI production-policy thresholds**. Current Insight source has `crossProviderSpreadPct.caution = 0.5%`, `danger = 2%`, and `block = 5%` in `src/lib/api/services/preTradeSafetyService.ts`; the 0.25% evaluation boundary is not an existing production cutoff.

The shadow candidate consumes synthetic representations of verified and bound source/destination facts. Missing or unusable evidence produces `REVIEW_REQUIRED / INSUFFICIENT_VERIFIED_BOUND_EVIDENCE`; a chain, venue, pool or token mismatch produces `REVIEW_REQUIRED / INTENT_MARKET_MISMATCH`. Neither is an adverse market finding. Evidence older than 30 seconds, quote age over 30 seconds, or spread above 50 bps asks for review unless a stronger fixed-minimum-output condition applies. A verified, scope-matched evidence-adjusted output below the exact intent's fixed minimum output yields `BLOCK / MINIMUM_OUTPUT_UNSUPPORTED`, or `BLOCK / STALE_QUOTE_MINIMUM_OUTPUT_UNSUPPORTED` when the quote is also older than 30 seconds; quote drift percentage alone never blocks.

The report separately checks every constructed escalation, zero false `BLOCK` on 20 controls, no more than 5% false `REVIEW_REQUIRED` on those controls, and a reason matching each constructed failure. Passing these **synthetic candidate checks** does not establish a useful decision improvement: the real current InterAI outcomes and workflow timing characteristics are still unavailable. No SDK export, partner policy pin, activation set, production endpoint, or live path is changed by this candidate.
