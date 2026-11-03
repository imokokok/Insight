# Turso fine-price migration

## Scope and invariants

This migration moves only the high-frequency, policy-controlled raw price
stream (`price_snapshots`) to Turso. Supabase retains the hourly business
snapshot, reports, feed-health data, and all other relational workflows.

The storage lifecycle is deliberately tiered:

- Turso `price_latest`: one hot row per feed, used for current-price fallback.
- Turso `price_snapshots`: immutable delta/event evidence, retained for 30
  days by default. Full-resolution policies still record every sample.
- Supabase `hourly_price_snapshots`: long-lived hourly business projection for
  reports and relational queries.

The collector uses a durable two-database hand-off:

1. The collector atomically writes Turso raw rows, `price_latest`, adaptive
   state, and an immutable slot payload.
2. The independent `Turso Price Projection` workflow reads pending slots and
   idempotently projects the hourly rows to Supabase using the slot hash and
   raw digest as a receipt.
3. Turso marks a slot acknowledged only after that receipt succeeds.

Interrupted hand-offs are replayed from the stored payload before the next
collection. A retry with different evidence for the same slot is rejected.

## Primary ingest control plane

In `primary` mode, raw capture no longer relies on a Supabase query or a
GitHub Actions runner being available:

```text
Cloudflare Cron (every 15 min, UTC)
  -> signed /api/cron/turso-ingest on Insight (Vercel Node runtime)
  -> Turso slot lease
  -> upstream oracle reads + atomic Turso raw slot capture
  -> best-effort Supabase rich-cache/feed-health side effects
Cloudflare Cron (three minutes after each capture)
  -> signed /api/cron/turso-project on Insight (Vercel Node runtime)
  -> bounded, receipt-backed Turso-to-Supabase outbox drain
```

The Cloudflare Worker only schedules and signs the request; it stores no
price data and has no Turso, Supabase, GitHub, or Vercel administrator token.
The Vercel route is deliberately separate from `CRON_SECRET` and accepts only
the `INGEST_SCHEDULER_SECRET` Bearer credential. Cloudflare Cron has a
15-minute invocation window, while the route has an explicit 180-second
maximum duration.

The existing GitHub `Snapshot Collect` workflow remains a delayed, guarded
fallback. Market-reference and manipulation-cost evidence now run in a
separate Actions job, so a transient Supabase evidence-write failure remains
visible but can never change the raw-capture ledger result.
Cloudflare starts raw capture at `:00/:15/:30/:45`; both Supabase-dispatched
and native GitHub fallback runs begin seven minutes later at
`:07/:22/:37/:52`. A runtime grace guard enforces the same delay, so an
accidental cron regression cannot make GitHub compete with Cloudflare during
the primary window. After that window its raw-capture step shares the Turso
lease, so a completed primary slot returns `already_captured` before it reads
an oracle or writes a second slot.

The active feed registry is administered in Supabase but mirrored as a
canonical, hashed last-known-good payload in Turso after successful
discovery/seed/reactivation runs. Primary-mode collectors and individual
provider resolvers use that mirror first. `TURSO_FEED_REGISTRY_MAX_AGE_SECONDS`
defaults to 86400 (valid range: 300–604800); when the mirror exceeds that
age, the resolver performs one bounded authoritative Supabase refresh rather
than silently using an indefinitely old configuration.

Cloudflare is also the projection workflow's primary clock: it invokes the
authenticated projector at minutes `3,18,33,48` and drains up to four bounded
outbox batches per invocation, allowing a multi-hour Supabase outage to catch
up in one successful run. GitHub's native schedule is a delayed, receipt-
guarded fallback at minutes `10,25,40,55`; it runs only when the Supabase
receipt proves that Cloudflare projection is stale. Supabase `pg_cron` no
longer participates in the projection critical path.

## Required configuration

The public database URL is committed in `snapshot-collect.yml`. Create a
least-privilege Turso database token in the Turso dashboard and save it as the
GitHub Actions secret `TURSO_PRICE_AUTH_TOKEN`. Do not put the token in a
tracked file or in a chat message.

For a local migration command, put these values in the Git-ignored `.env.local`:

```dotenv
TURSO_PRICE_DATABASE_URL=libsql://insight-imokokok.aws-ap-southeast-1.turso.io
TURSO_PRICE_AUTH_TOKEN=<database-token>
TURSO_PRICE_PARTITION_KEY=bootstrap
TURSO_PRICE_WRITE_MODE=legacy
TURSO_PRICE_RAW_RETENTION_DAYS=30
TURSO_FEED_REGISTRY_MAX_AGE_SECONDS=86400
```

`TURSO_PRICE_WRITE_MODE` defaults to `legacy`. It is intentionally not
advanced by database creation or deployment.

`TURSO_PRICE_RAW_RETENTION_DAYS` accepts 1–3650 and defaults to 30. It applies
only to Turso fine-grained event rows; it never deletes `price_latest`, an
unacknowledged Turso slot payload, or Supabase hourly business data.
Acknowledged slot payloads older than the same window are compacted to their
hashes, digest, counts, and an empty-input audit marker. In production the
projector workflow also accepts repository variables
`TURSO_PRICE_PROJECTION_BATCH_SIZE` (default 16) and
`TURSO_PRICE_PROJECTION_MAX_LAG_SECONDS` (default 1800).

### Scheduler secrets

For production, create one random scheduler value and install the identical
value as an encrypted production environment variable in Vercel and as a
Cloudflare Worker secret:

```text
Vercel project (production only): INGEST_SCHEDULER_SECRET
Cloudflare Worker secret:          INGEST_SCHEDULER_SECRET
```

Do not place this value in GitHub Actions, `wrangler.jsonc`, a URL, or an
application-visible variable. Rotate both ends together; a mismatch fails
closed with HTTP 401 and leaves existing Turso data untouched.

## Rollout

1. Apply the checked-in Supabase migration `0113_turso_price_projection.sql`
   through the normal production migration process.
2. With the database token available, run `npm run turso:price:migrate`. It is
   additive and verifies the schema/version and default policy; it cannot
   create or delete a Turso database.
3. Run `npm run build:cron`, then deploy both generated collector and projector
   bundles while still in `legacy` mode.
4. Once the workflow definition containing `dispatch_id` and `scheduled_for`
   inputs is on the default branch, apply
   `0114_turso_price_projection_dispatcher.sql`, then
   `0115_cloudflare_ingest_fallback.sql`, then the concurrently shipped
   `0116_oracle_watch_windows.sql` and `0117_position_lifecycles.sql`, and finally
   `0118_cloudflare_primary_projection.sql`. The final migration removes the
   projection job from Supabase `pg_cron` while retaining the delayed GitHub
   fallback. Do not apply these activation migrations before their workflows
   are available on `main`.
5. Set the GitHub Actions repository variable `TURSO_PRICE_WRITE_MODE=shadow`
   for several complete collection cycles.
   Supabase remains authoritative. Each Turso slot must exactly match the
   Supabase write shape: received, candidate, persisted, full-resolution, and
   stable-skipped counts. Before the first shadow capture, and again if
   Supabase advanced while the collector was in `legacy`, the collector
   atomically rebaselines Turso's mutable adaptive state and persistence policy
   from Supabase. Immutable Turso evidence is retained. This prevents a
   rollback/resume gap from being misread as a pricing difference. On the
   first warm-up slot, adaptive rows can still be classified as `initial`
   instead of Supabase's historical write reason; this is logged for review but
   does not alter the stored row set or source of truth. All later
   classification differences remain observable in the job log.
6. Inspect the Turso `snapshot_slots` backlog. Every new shadow slot must be
   acknowledged after its parity check, and no shadow mismatch may have
   occurred.
7. Record an ISO-8601 UTC boundary in the GitHub Actions repository variable
   `TURSO_PRICE_READ_CUTOVER_AT`, then set `TURSO_PRICE_WRITE_MODE=primary` in
   the same release. Raw-history readers use Supabase before that instant and
   Turso from that instant onward. The service refuses primary writes if the
   boundary is absent or invalid.
8. Deploy the Vercel release containing `/api/cron/turso-ingest` and
   `/api/cron/turso-project`, set the production-only
   `INGEST_SCHEDULER_SECRET`, then deploy `workers/turso-ingest-scheduler/`
   with the identical Worker secret. The Worker configuration is the sole
   owner of the raw `*/15 * * * *` and projection `3,18,33,48 * * * *` Cron
   triggers; allow up to 15 minutes for a Cron-trigger change to propagate.
9. Invoke the signed ingest route once for the current quarter-hour and verify one
   `snapshot_ingest_leases` row reaches `completed_at_ms` only after the
   matching `snapshot_slots` row exists. Check the Cloudflare Worker log for a
   `turso_ingest_triggered` event. Then invoke the signed project route and
   verify that its receipt exists in `turso_price_slot_receipts`. Both routes
   must reject an unauthenticated request with 401.

## Rollback

Set `TURSO_PRICE_WRITE_MODE=legacy` and redeploy the collector. This returns
new fine-price writes and reads to the existing Supabase flow. Do not delete
Turso data or the Supabase receipt table; they are required to investigate or
replay an interrupted hand-off.

If the independent scheduler must be paused, remove its Cron entry through
the Worker configuration and deploy that configuration; do not delete the
Worker, the signing secret, or any Turso evidence. Retain the GitHub fallback
until a replacement capture path has been verified.

## Verification commands

```bash
npm run db:check:turso-price-projection
npm run db:check:turso-price-projection-dispatcher
npm run db:check:cloudflare-primary-projection-migration
npm run turso:price:migrate
npm run worker:turso-ingest:check
npx jest src/lib/turso/price/__tests__ src/lib/reports/__tests__/snapshotIngest.test.ts src/lib/supabase/__tests__/snapshotHistory.turso.test.ts --runInBand
```

After the primary release, check that each Turso slot has an acknowledgement,
that the Supabase receipt count advances with collection slots, and that a
history query spanning the cutover returns both sides in timestamp order. The
projection workflow prints `before`, `projected`, `after`, `oldestLagSeconds`,
`rawEventsPruned`, and `acknowledgedPayloadsCompacted`; a non-empty backlog
older than its lag threshold fails the workflow for alerting. In primary mode,
`GET /api/v1/health/ready` also reports a projection check (`ok`,
`catching_up`, `lagging`, or `unknown`) plus pending-slot and lag details. That
signal does not make fresh Turso-backed price reads unavailable merely because
the independent Supabase projection is catching up.

The readiness endpoint now reports four independent checks in primary mode:
`tursoRawCapture`, `scheduler`, `supabase`, and `projection`. This separates
a fresh raw data plane from a degraded Supabase query/control plane instead of
labeling both simply as `database: ok`. `projection` can be `catching_up`,
`lagging`, or `quarantined`; retryable failures back off from one minute to a
15-minute maximum and do not block later slots. A quarantined slot preserves
its original payload and hash for review. To explicitly replay a reviewed
slot, use the exact identifiers from Turso (never edit a slot payload):

```bash
TURSO_PRICE_REQUEUE_SLOT_MS=<epoch-ms> \
TURSO_PRICE_REQUEUE_INPUT_HASH=<64-hex-input-hash> \
npm run turso:price:requeue
```

The `Turso Control Plane Alert` GitHub workflow checks this readiness endpoint
at minutes `12,27,42,57`. A failing check opens one deduplicated GitHub Issue
and comments on it while the incident remains open; the first healthy check
comments with recovery evidence and closes it. This alert is intentionally
outside the Supabase scheduler failure domain.
