# Insight `price_records` on Cloudflare D1

**Status:** implementation prepared for the D1 shadow phase. The D1 binding and
schema are part of the Worker configuration. Production cutover follows the
24-hour shadow reconciliation below; Supabase remains the fallback until the
short cache window has drained.

## Scope decision

Only the short-lived `price_records` cache moves. It is not the canonical price
history: successful 15-minute observations and long-range history remain in
Supabase/Turso's existing archive workflow. The cache expires after 24 hours
and can be rebuilt by new price observations.

The latest account observations (2026-11-25) support a cautious D1 rollout:

- Supabase `pg_database_size()` returned 403,139,731 bytes, about 81% of the
  Free 500 MB database quota. `pg_total_relation_size('price_records')` returned
  16,130,048 bytes; moving it frees about 4% of the measured database size.
- `pg_stat_statements` had a 26.2-hour collection window. It recorded 64
  `price_records` insert rows, 3,841 calls to price-record read statements, and
  23 TTL-cleanup calls. The 5,104 shared blocks dirtied by inserts are buffer
  activity, not a direct disk-I/O quota measurement.
- The earlier zero-cost plan estimated about 250 rows/hour. That is materially
  higher than the latest statement sample, so D1 budget planning retains that
  earlier rate as a conservative estimate until a full post-cutover day is
  measured. At 250 rows/hour, two secondary indexes, and matching TTL deletes,
  this is roughly 36,000 D1 row writes/day (estimate: 6,000 inserts × 3 rows
  including index entries, plus 6,000 deletes × 3). Account usage currently
  adds about 692 D1 writes/day across the other databases. This stays below the
  Free 100,000 writes/day limit, with monitoring required for burst growth.
- Before this migration, the D1 free-tier account used 12.16 MiB of 5 GiB and 4
  of 10 databases. The new fifth database was created in APAC on 2026-11-25;
  after schema application it measured 36.9 KB and reported 0 rows read/written
  in its 24-hour account window. It is small relative to the 5 GiB storage and
  10-database limits. Its 24-hour workload is also far below the 5 million
  rows-read/day ceiling.

The D1 write ceiling is a hard stop after exhaustion. Keep the two-index schema,
the 24-hour TTL, and the D1 daily write review together. Do not move Turso's
high-frequency raw snapshots, lease/control rows, settlement evidence, or
Supabase's long-lived archives and transactional tables to D1: their write,
atomicity, retention, or relational requirements do not fit this cache design.

## Data flow and failure behavior

1. `d1-shadow`: Supabase receives the canonical write and D1 receives a
   best-effort copy. Reads continue from Supabase. D1 failures are logged and
   do not fail the price observation.
2. After 24 hours of shadow writes, compare sampled provider/symbol/chain,
   timestamp, price, confidence, signal vector, verification, and TTL values.
   Compare the D1 row count with Supabase's non-expired row count. Do not cut
   over if counts or sampled fields differ.
3. Set `TURSO_PRICE_RECORDS_MODE=d1`. Reads prefer D1 and fall back to
   Supabase on a miss or D1 error. Writes go to D1; Supabase is written only if
   D1 fails. Keep `TURSO_PRICE_RECORDS_FALLBACK_ON_MISS=true` during cutover.
4. After one further 24-hour cache TTL and a clean production review, the
   fallback may remain enabled; it costs a Supabase query only when D1 misses
   and is useful for rollback. Changing it to `false` is an operational
   decision and is not required to complete the data move.

No historical bulk backfill is used. `price_records` is a 24-hour cache, the
shadow phase warms D1 from live writes, and Supabase remains authoritative until
reconciliation passes. This avoids a bulk D1 write burst and a moving-snapshot
race.

Rollback is `TURSO_PRICE_RECORDS_MODE=supabase`. During shadow, Supabase remains
fully current. After D1 cutover, the fallback writes any D1-failed batch to
Supabase; switching back restores Supabase reads immediately. Keep the
Supabase table and indexes for at least seven days after cutover so rollback
remains available.

## Schema and operations

The `insight-price-records` D1 database ID is
`c23c2775-998b-48a5-b428-7b53e25a3d24` and its primary location is APAC. The
`0001_price_records.sql` migration is already applied. The schema preserves exact eight-decimal
price text, JSON evidence fields, millisecond timestamps, and nullable chain
semantics. The indexes cover current-price lookup and timestamp-ordered export;
TTL cleanup scans the bounded 24-hour cache to avoid paying for a third index
on every insert and delete.

Verify the selected D1 database with:

```sh
npx wrangler d1 execute insight-price-records --remote \
  --command "SELECT COUNT(*) AS rows, MIN(ttl_ms) AS oldest_ttl_ms, MAX(ttl_ms) AS newest_ttl_ms FROM price_records"
```

Verify D1 writes and reads using Cloudflare's D1 Insights for the full 24-hour
shadow and cutover windows. Recheck the actual Turso monthly write percentage
and Supabase database size after one week. Do not remove the Supabase source
table as part of this move.
