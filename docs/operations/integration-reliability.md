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
upstream, so no usable row was delivered; `timeout`, `free`, `replay` and
`unconfirmed` cover the remaining zero-charge outcomes. Keeping the first two
apart lets reconciliation tell "the market had no data" from "our upstreams
were down".

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
enforced inside `precheck_credits`/`consume_credits`. When a call brings the key
to 80% of its cap, the successful response also carries
`X-Credit-Budget-Warning: 80`. At 100% the precheck rejects the request with 402
`reason: "BUDGET_EXCEEDED"` and no credits are debited. Caps are calendar-month
scoped and do not carry over.

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
