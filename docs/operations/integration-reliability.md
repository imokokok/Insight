# Integration and recovery checks

Public configuration and readiness, with no key, paid call or wallet operation:

```sh
npm run integration:doctor -- --offer insight
npm run integration:doctor -- --offer combined
```

Insight-only users can run the same command from the Insight checkout with
`--offer insight`. A successful public check proves HTTP readiness and advertised
configuration, not live RPC/TSA availability, signer trust or an executable trade.
Diagnostic JSON contains no supplied API key. Redirects are refused to avoid
forwarding credentials to another origin.

An explicit coverage probe uses the existing Insight API and is billable under
the key's plan. Set `INSIGHT_API_KEY` in the environment, never a command argument:

```sh
npm run integration:doctor -- --offer insight --probe --asset USDC --chain 1 --freshness 300 --samples 3
```

Samples run sequentially, at least one second apart, with at most ten samples.
An insufficient freshness quorum exits nonzero and lists per-source reasons,
source ages, read durations and any participant/group shortfall. This is a
coverage diagnostic, not a signed assessment or proof of market danger. A cache
hit may return old source data; read latency and source age are different fields.

## Durable client state

`examples/durable-state/store.mjs` is a Node filesystem example for a single
writer process. It uses serialized writes, a temporary file, fsync and atomic
rename; files are private to the local user. Put the directory on persistent
storage, outside Git and any web-served directory. Local disk on an ephemeral
serverless instance is unsuitable. A pre-existing `.writer` lock refuses a
second process; after a crash, confirm the original process has stopped before
removing that lock. Corrupt state fails closed rather than silently resetting.
Use a transactional shared store with fencing for multiple hosts; this example
does not claim distributed coordination or encryption at rest.

```js
import { openDurableState } from './examples/durable-state/store.mjs';
const state = await openDurableState('/private/persistent/insight-watch');
const watch = guard.watch(
  { symbol: 'ETH', chain: 'ethereum' },
  { stopOnHalt: false, stateAdapter: state }
);
// Keep the process alive while monitoring. When shutting down:
watch.stop();
await watch.done;
await state.close();
```

Restore with the same directory and target on the next process start. A healthy
sample alone does not clear a persisted halt; recovery still requires explicit
operator acknowledgement. No example automatically resumes funds movement.
Store only checkpoints and Watch state, never wallet keys or API credentials.
For authorization checkpoints and the local EVM recovery drill, see the
[PriorSeal recovery runbook](https://github.com/imokokok/PriorSeal/blob/main/docs/runbooks/reliability.md).

## Audit availability

Pre-Trade and Oracle Watch now commit their per-issuance audit rows before
returning a successful REST or MCP judgment. If `pre_trade_checks` or
`oracle_watch_checks` cannot be written, the call fails closed; no verdict or
receipt is issued and the REST success-only credit charge is not attempted.
Treat audit-storage availability as part of these services' readiness and
investigate write failures rather than interpreting missing rows as a healthy
period with no usage. This deliberately favors evidence completeness over
availability during a database incident.

## Billing validation and reconciliation

Run `npm run test:reliability` to exercise the actual credit-wallet migrations in
isolated embedded PostgreSQL: grants, debits, idempotent replay, budget and balance
rejection, and backup/restore replay. Test credits are local fixtures, not payment
provider settlements or customer wallet mutations.

Operators can run `scripts/credit-reconcile.sql` through an existing privileged
psql connection. It enforces a read-only repeatable-read transaction and reports
aggregate wallet, ledger-chain, frozen-balance and missing-wallet inconsistencies.
It never repairs a balance. Investigate mismatches against original ledger and
payment records; do not create compensating credits merely to make totals match.

REST responses now include `X-Credit-Receipt` for a metered request,
`X-Credit-Status` (`charged`, `replayed`, `not_charged`, or `unconfirmed`), and
`X-Credit-Balance-After` only when the database confirmed a balance. The existing
`X-Credit-Balance` remains the precheck snapshot. `unconfirmed` retains the
existing availability policy after RPC failure; it does not establish whether
the debit committed. Look up the receipt in `credit_ledger.metering_key` before
manual reconciliation. HTTP retries remain separate billable requests; these
headers do not introduce client-controlled cross-request idempotency.

`X-Credit-Zero-Reason` and the `waiver` row's `credit_ledger.reason` share one
vocabulary: `insufficient_data` means the evidence grade itself could not
support a conclusion; `upstream_failed` means every requested batch item failed
upstream, so no usable row was delivered; `tool_free` means the tool or
verification kind is zero-priced by design (offline verification); `timeout`,
`free`, `replay` and `unconfirmed` cover the remaining zero-charge outcomes.
Keeping the first two apart lets reconciliation tell "the market had no data"
from "our upstreams were down", and `tool_free` apart from both lets it tell a
pricing decision from a data outcome.

An all-failed batch is a deterministic terminal outcome, so its replay cache
entry keeps the original `zeroReason: upstream_failed` for audit. The replayed
response itself reports `X-Credit-Zero-Reason: replay` at zero cost: the cache
preserves `upstream_failed`, while the header says the request was replayed.

### Application rollback across 0126

Migration `0126` replaced `consume_credits(uuid,numeric,text,text)` with an
eight-argument version and `top_up_credits(uuid,numeric,text,text,text)` with a
nine-argument version. The new trailing parameters (`source`, `reason`,
`request_id`, `meta`) all carry SQL `DEFAULT`s, so an older build's four-argument
charge and five-argument top-up still resolve and settle normally. The earlier
"do not roll back to a build before #479" constraint is withdrawn: rollback is
allowed, provided the response structure is verified after the rolled-back build
starts serving.

Verification means one charge and one top-up against a test key:

- `consume_credits` with four arguments must still return `{ok: true, cost,
balance}`;
- `top_up_credits` with five arguments must still return the new balance as a
  bare numeric.

This was measured against the `0126`→`0128` chain in embedded PostgreSQL: five-argument `top_up_credits` returned `100.00`; four-argument `consume_credits` returned `{"ok":true,"cost":5,"balance":95}`.

The cost of rolling back is traceability, not correctness. A pre-`0126` build
cannot supply the new arguments, so every ledger row it writes records
`source`, `reason`, `request_id` and `meta` as `NULL`. Credits are still debited
and topped up correctly, but those rows cannot be attributed to a funding
bucket (`free`, `subscription`/entitlement, or `wallet`), and the `request_id`
link back to `X-Credit-Receipt` is lost. Any source bucketing or per-bucket
reconciliation that depends on those columns will show a gap for the rollback
window. Record the window's start and end and reconcile it manually; do not
delete or rewrite the `NULL` rows to hide the gap.

Per-key spend caps are set with `PATCH /api/user/api-keys/:id`
(`{"budgetMonthly": <credits> | null}`; also editable in Settings → Billing) and
enforced inside `precheck_credits`/`consume_credits`. The precheck admits a call
whose projected usage is still within the cap (`used + cost <= budget`) and
rejects only the call that would exceed it. A call landing exactly on the cap
(`used + cost == budget`) succeeds, debits credits and carries
`X-Credit-Budget-Warning: 80`; the next call returns 402
`reason: "BUDGET_EXCEEDED"` with no debit. The warning header is a threshold
marker, not a measurement: its value is always the literal `80`, meaning "this
key has crossed 80% of its cap". Do not turn it into a computed percentage
(add a separate header if a live percentage is ever needed) and do not change
the rejection rule to `>=`. Caps are calendar-month scoped and do not carry
over.

### Funding-source attribution

`credit_ledger.source` answers "which bucket paid for this call", using the
three buckets already allowed by `credit_ledger_source_check`:

- `free` — signup/trial grants (`source = signup`, and any grant tagged `free`);
- `subscription` — plan allowances (`source = subscription`) and
  entitlement-covered product calls;
- `wallet` — money-funded top-ups (`source = wallet` or `x402`).

Attribution is FIFO over lots. Every positive-delta `grant`/`topup`/`refund`
row is a lot, ordered by `created_at` (then `id`). A charge is allocated to the
oldest unexhausted lot first, so a user spending a signup grant is recorded
against `free` even though the wallet holds one pooled balance. Per-lot
allocations are written to the existing `meta` JSONB as
`[{ "lotId": <credit_ledger.id>, "source": "free" | "subscription" | "wallet" | null, "amount": <credits> }]`.
The row-level `source` is the allocation with the largest amount; on a tie the
older lot wins. Lot exhaustion is derived (`sum(lot amounts) - wallet balance`),
so this needed no new table, no new column, no DDL, and neither
`consume_credits` nor the balance calculation changed.

Historical rows are excluded from the rule. Every row written before 0126 has
`source`, `reason`, `request_id` and `meta` as `NULL` (2092 rows at the
attribution cutover); those are pre-bucketing history whose provenance cannot
be reconstructed. They are not backfilled and must not be rewritten: inventing
today's bucket for a past charge would fabricate an audit trail. A new charge
that lands on an untagged historical lot is therefore written with
`source = NULL` and an allocation whose `source` is `null`, until those lots
are exhausted. Reconciliation should treat `NULL` as "before bucketing"
(`meta IS NULL`), or "attribution unavailable / legacy lot" (`meta.allocations`
present with a null source), never as a fourth funding bucket.

Entitlement-covered MCP calls (a product-priced tool whose per-call cost is 0
because the purchase already happened) now write an audit row instead of
disappearing: `kind = waiver`, `delta = 0`, `source = subscription`,
`reason = tool_free`. The wallet is untouched. This uses the existing
`record_waived_credit` RPC and the same `waive:`-prefixed key as every other
zero-charge outcome, so it remains idempotent and never blocks a later charge.

Known gap, with a hard boundary: attribution reads the ledger before
`consume_credits` serializes the wallet row, so two concurrent charges for the
same user can attribute the same lot slice twice. **What this can corrupt is
only the accounting detail** — `meta.allocations` may overlap across rows, and
the row-level `source` (derived from those allocations) may therefore name the
wrong bucket. **What it can never corrupt is the money**: `delta`,
`balance_after`, the wallet balance and the debit itself are decided atomically
by `consume_credits`, which still locks the wallet row and still deduplicates on
`metering_key`. Do not "fix" this by changing `consume_credits`; the fix, when
it comes, is a transactional attribution RPC or a lot table.

The gap is detectable, not merely acknowledged: a usage row is suspicious when
its recorded allocations do not add up to the amount actually charged. Run this
before any source-bucket report:

```sql
select id,
       metering_key,
       delta,
       source,
       (select coalesce(sum((a->>'amount')::numeric), 0)
          from jsonb_array_elements(meta->'allocations') a) as allocated
from credit_ledger
where kind = 'usage'
  and meta ? 'allocations'
  and (select coalesce(sum((a->>'amount')::numeric), 0)
         from jsonb_array_elements(meta->'allocations') a) <> abs(delta);
```

Zero rows means the attribution detail is consistent for the window being
reported. Non-zero rows must be excluded from source-bucket totals (or counted
as an explicit `overlap` bucket) until the transactional fix lands; they are
never evidence that the balance or the charge is wrong.

## Source latency and coverage

Coverage probes expose per-provider `fetchDurationMs` and `freshnessShortfall`.
Fetch duration includes source adapter/cache and feed-health bookkeeping; it is
not pure network latency. Reputation lookup now overlaps source reads, and only
in-flight reads of the same public provider/asset/chain are shared. Completed
assessments are never cached by this mechanism and fresh quorum is unchanged.

The historical latency endpoint computes exact observation-weighted percentiles
inside Postgres from the 15-minute `price_snapshot_history` view, including
archived days. It returns `sampleSize` (valid measured durations),
`rowsExamined` (all matching collector observations), and `observationSource`.
After migration 0074, `truncated` remains in the response for compatibility and
is always `false`. If that migration is absent, the endpoint temporarily falls
back to its former bounded hourly read, reports `observationSource` as
`hourly_price_snapshots`, and can still return `truncated: true`. The repeatedly
overwritten hourly table and recovery-only probes are excluded from the new
15-minute percentiles so sampling cadences are not mixed. New collector runs persist measured adapter duration for successful and
failed reads; older rows with missing timings stay unknown and are not
backfilled with invented values. These are source-adapter observations, not
whole-request production API latency or a 30-day service-level measurement.

## Production health

The [PriorSeal `Public service health` GitHub workflow](https://github.com/imokokok/PriorSeal/actions/workflows/service-health.yml) checks both products every fifteen
minutes and confirms a failed check one minute later. Failures use the owner's
existing GitHub Actions notification settings; no Slack/email destination is
invented. Artifacts are kept for fourteen days. GitHub schedules can be delayed,
so this is a low-cost health check, not a one-minute uptime SLA. A failed check
does not trigger migration, transaction replay or automatic rollback.

For a failure: inspect the artifact and request time, separate liveness from
readiness, inspect the owning platform's logs, and follow the existing operations
runbook. Frontend crashes and platform-wide 5xx still require the existing Sentry
and hosting dashboards; public HTTP checks do not replace them.

## Route-level request deadline

Every REST route invocation runs under its own 25-second wall-clock budget
(`ROUTE_DEADLINE_MS`). Each request creates and clears its own timer, so a slow
route cannot shorten or consume another route's budget; there is no process- or
deployment-wide deadline. The budget covers the route handler's work after
authentication, rate limiting and quota prechecks, not the middleware itself.

When the budget expires the response is HTTP `504` with
`error.code = "ROUTE_DEADLINE_EXCEEDED"`,
`error.details = { scope: "route", deadlineMs: 25000 }` and
`error.retryable = true`. The call is not charged: the response carries
`X-Credit-Status: not_charged` and `X-Credit-Zero-Reason: timeout`, and one
`waiver` ledger row is written with `reason = "timeout"`.

`ROUTE_DEADLINE_EXCEEDED` is deliberately not folded into `UPSTREAM_TIMEOUT`.
Both are `504`, but the attributable party differs: one is an upstream that
timed out, the other is this service abandoning the request. Merging them would
permanently bias upstream health statistics, which are the evidence used to
decide whether a data source should be replaced. Our own refusals stay distinct:
`402` credit exhaustion, `429` rate limit and `503` settlement unavailable.

The deadline bounds the response, not the upstream call. Upstream work continues
after the deadline and its result is discarded; no `AbortSignal` is propagated
through the data adapters yet, so sockets and subrequests are not released
early. This is a known gap: the guarantee is "an answer within 25 seconds", not
"upstream work stops at 25 seconds". A success that arrives after the deadline is
never billed: the charge commits only after the awaited handler result, and the
deadline path has already returned, so a late result adds no debit, no second
waiver row and no second usage row.

MCP does not share this deadline. The MCP transport and its tool handlers are
bounded by per-upstream timeouts and the hosting platform's function duration;
this repository does not impose a 25-second route-level budget on MCP. Do not
read the REST number as a product-wide guarantee.
