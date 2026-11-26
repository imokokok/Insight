# Insight `price_records` on Cloudflare D1

**Status (verified 2026-11-26 05:12 UTC / 13:12 Beijing):** D1 is the primary
store for the short-lived `price_records` cache. The production Worker and
scheduled collector use `TURSO_PRICE_RECORDS_MODE=d1`, with
`TURSO_PRICE_RECORDS_FALLBACK_ON_MISS=true`. Supabase remains the fallback and
rollback store; its table is intentionally retained. This is a scoped cache
migration, not a migration of the canonical historical price data.

## Cutover evidence

- Production deployment is commit `fd1e5acfcd8c8378939b5789169b991bfc3268d9`
  (PR #721). The Node-based GitHub Actions collector sends bounded batches to
  the authenticated Worker endpoint because it cannot use a Worker D1 binding
  directly.
- The pre-cutover shadow period was about 10 hours, shorter than the originally
  planned 24 hours. The 18:00 UTC batch had a 257-row persisted-field
  reconciliation; subsequent checks covered batch counts and the fallback
  paths. Do not describe this rollout as having completed a full 24-hour
  shadow.
- The first scheduled post-cutover hourly batch, GitHub Actions run
  `45758694215` at 05:00 UTC, succeeded with D1 mode and miss fallback enabled.
  It logged `observations=562`, `selected=442`, and `saved=243`. D1 contained
  243 rows for that minute; Supabase had no new rows for the same minute.
- At the same audit, D1 held about 2,984 rows and no expired rows. These checks
  establish that live writes reached D1; they do not prove that every possible
  provider or symbol has been reconciled over a complete day.

## Scope and data flow

Only the 24-hour `price_records` cache moved. Long-lived price history,
15-minute observations, archives, and other durable evidence remain in their
existing Supabase/Turso workflows. There is no historical bulk backfill; live
observations warm the cache and avoid a large write burst or a moving-snapshot
race.

1. GitHub Actions posts validated bounded batches to
   `POST /api/cron/price-records` with `CRON_SECRET`; the Worker writes them to
   D1. In D1 mode, successful writes go to D1. If a D1 write fails, the batch
   falls back to Supabase and the failure is logged.
2. Reads try D1 first. A D1 miss or read error falls back to Supabase while
   `TURSO_PRICE_RECORDS_FALLBACK_ON_MISS=true`.
3. Historical queries continue to use the established durable snapshot and
   archive paths. D1 is a cache here, not the source of long-range history.

Keep the fallback enabled through normal operation. It protects reads during
cache warm-up and provides a safety path if D1 has a transient failure. To roll
back reads and writes, set `TURSO_PRICE_RECORDS_MODE=supabase` in both
`cloudflare.config.ts` and `.github/workflows/snapshot-collect.yml`, then deploy
the Worker and workflow together. Keep the Supabase table and indexes. No
fallback flag change or table deletion is part of this migration.

## Capacity snapshot

The following account readings were collected at approximately 05:12 UTC on
2026-11-26. Quotas can change; check the provider dashboards before making
capacity decisions.

| Service                | Observed use                                                                                                                                | Interpretation                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare D1, account | About 168,566 rows read and 11,948 rows written in the prior 24 hours; about 14.4 MB stored across 5 of 10 databases                        | Roughly 3.4% of the 5 million daily read limit, 12% of the 100,000 daily write limit, and under 1% of the 5 GB aggregate storage limit. The new database itself was about 1.6 MB.                                                                  |
| Supabase Postgres      | About 384 MB database size; `price_records` about 4,567 unexpired rows and 15 MB total relation size                                        | At a 500 MB Free database limit this is about 77%, with about 116 MB nominal headroom. The cache table is only a small part of total use; archives and snapshots are larger.                                                                       |
| Turso Starter          | About 685 MB / 5 GB storage; 35.6 million / 500 million monthly rows read; 7.9 million / 10 million monthly rows written; overages disabled | Reads and storage have headroom. Writes are at 79% of the monthly allowance and are the remaining capacity watch item. The allowance was due to reset 2026-12-01 08:00 Beijing time. Moving this cache did not remove Turso's other write streams. |

The Supabase `price_records` rows are still within their 24-hour TTL just after
cutover, so their presence is expected. Cleanup and PostgreSQL space reuse are
not instantaneous; ordinary vacuum makes dead space reusable inside the
database, but does not necessarily shrink the reported database file size.
Do not run `VACUUM FULL` as a routine capacity step because it takes an
exclusive lock. The Supabase table remains useful as fallback regardless of
whether its current size has fallen.

The D1 Free plan's published limits are 5 million rows read/day, 100,000 rows
written/day, 5 GB aggregate storage, and 10 databases. See [D1 pricing and
limits](https://developers.cloudflare.com/d1/platform/pricing/) and [D1
limits](https://developers.cloudflare.com/d1/platform/limits/). D1 is a hard
quota boundary on Free: if daily limits are exhausted, affected queries fail.
The provider's [D1 metrics guidance](https://developers.cloudflare.com/d1/observability/metrics-analytics/)
describes the usage metrics to review.

## Schema and query-cost decision

The `insight-price-records` D1 database ID is
`c23c2775-998b-48a5-b428-7b53e25a3d24`, located in APAC/HKG. The
`0001_price_records.sql` migration is applied. Price values remain exact
eight-decimal text, evidence fields remain JSON, timestamps are milliseconds,
and nullable chain semantics are preserved.

Keep the two current indexes: `price_records_latest_idx` supports the hot
current-price lookup, and `price_records_timestamp_idx` supports
timestamp-ordered access. Do not add a TTL index at current scale. The cleanup
full-scans a small, bounded cache: roughly 742 rows per cleanup × 20 cleanups
per day is about 14,850 rows read/day, or 0.3% of the D1 daily read quota. A
third index would add writes to inserts and deletes to save a negligible scan
budget. Revisit only if measured cache size or cleanup cost grows materially.

The migration file and schema are in `migrations/0001_price_records.sql`.
Verify the selected remote database with:

```sh
npx wrangler d1 execute insight-price-records --remote \
  --command "SELECT COUNT(*) AS rows, MIN(ttl_ms) AS oldest_ttl_ms, MAX(ttl_ms) AS newest_ttl_ms FROM price_records"
```

## Operations and review triggers

- Review D1 daily read/write metrics during the first week and after changes to
  cache volume or cleanup cadence. Investigate if daily writes exceed 80,000,
  reads exceed 4 million, or the table grows beyond its expected 24-hour
  working set. These are investigation thresholds, not provider quotas.
- Review Turso monthly writes before the reset while usage remains near 80% and
  overages are disabled. Attribute the write-heavy statements before changing
  retention or moving any durable tables; this D1 cache migration does not
  address Turso's remaining workload.
- Recheck Supabase database size after TTL cleanup and routine vacuum have had
  time to run. The `price_records` table is not the primary contributor to the
  current database size, so large savings should not be expected from this
  move alone.
- Keep the Supabase table and indexes for fallback. Do not move raw snapshots,
  lease/control rows, settlement evidence, long-lived archives, or other
  transactional data into this D1 cache design.
