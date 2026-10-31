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

## Rollout

1. Apply the checked-in Supabase migration `0113_turso_price_projection.sql`
   through the normal production migration process.
2. With the database token available, run `npm run turso:price:migrate`. It is
   additive and verifies the schema/version and default policy; it cannot
   create or delete a Turso database.
3. Run `npm run build:cron`, then deploy both generated collector and projector
   bundles while still in `legacy` mode.
4. Set the GitHub Actions repository variable `TURSO_PRICE_WRITE_MODE=shadow`
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
5. Inspect the Turso `snapshot_slots` backlog. Every new shadow slot must be
   acknowledged after its parity check, and no shadow mismatch may have
   occurred.
6. Record an ISO-8601 UTC boundary in the GitHub Actions repository variable
   `TURSO_PRICE_READ_CUTOVER_AT`, then set `TURSO_PRICE_WRITE_MODE=primary` in
   the same release. Raw-history readers use Supabase before that instant and
   Turso from that instant onward. The service refuses primary writes if the
   boundary is absent or invalid.

## Rollback

Set `TURSO_PRICE_WRITE_MODE=legacy` and redeploy the collector. This returns
new fine-price writes and reads to the existing Supabase flow. Do not delete
Turso data or the Supabase receipt table; they are required to investigate or
replay an interrupted hand-off.

## Verification commands

```bash
npm run db:check:turso-price-projection
npm run turso:price:migrate
npx jest src/lib/turso/price/__tests__ src/lib/supabase/__tests__/snapshotHistory.turso.test.ts --runInBand
```

After the primary release, check that each Turso slot has an acknowledgement,
that the Supabase receipt count advances with collection slots, and that a
history query spanning the cutover returns both sides in timestamp order. The
projection workflow prints `before`, `projected`, `after`, `oldestLagSeconds`,
`rawEventsPruned`, and `acknowledgedPayloadsCompacted`; a non-empty backlog
older than its lag threshold fails the workflow for alerting.
