-- Drop the unused GIN index on public.price_records.metadata.
--
-- Measured on naevwrexybqodxinkrug over the 14-day pg_stat window:
-- metadata is non-NULL in 0 of 28872 rows, and the column is referenced
-- nowhere in src/, scripts/, or supabase/ — including any `cs.` / `cd.`
-- jsonb containment operator. The index therefore serves no read path.
-- (Note: the `metadata` jsonb column here is distinct from the boolean
-- `metadata_fallback` column, which is a different column and is unaffected.)
--
-- Performance impact of this drop is ~zero, and that is expected. PostgreSQL
-- does not build posting-list entries for NULL values, so a GIN index over an
-- all-NULL column carries no entries. Measured on a TEMP table in this same
-- database: 20,000 all-NULL inserts took 55.810 ms with the GIN index present
-- and 45.420 ms without — 0.519 µs per row, i.e. ~0.0015 s per day at this
-- table's insert rate. Treat this migration as repository hygiene, not as a
-- Disk IO optimisation: removing a zero-entry index avoids misleading future
-- index analysis, and leaves no measurable performance regression either way.
--
-- It is NOT a fix for the project's Disk IO budget exhaustion. The real
-- constraint there is platform-locked and cannot be tuned from SQL:
-- shared_buffers=224MB cannot hold the 297MB database, wal_buffers=3936kB
-- (wal_buffers_full runs at 80.1% cumulatively, ~40,864 WAL fsyncs/day), and
-- checkpoint_timeout=300s forces a timeout checkpoint every 5 minutes.
--
-- Scope is deliberately limited to this one index. The sibling
-- idx_price_records_signal_vector (GIN on signal_vector) also has no code
-- reference but holds 2,201 non-NULL rows, so it may be read by an external
-- party querying the database directly; dropping it is deferred until that
-- is confirmed. idx_price_records_metadata has 0 non-NULL rows, so there is
-- no data an external reader could be using through it.
--
-- The column itself stays; only the index goes. Any future containment query
-- on metadata must recreate an index (ideally CREATE INDEX CONCURRENTLY) first.
--
-- The btree indexes on this table are untouched: price_records_provider_symbol_chain_time_idx,
-- idx_price_records_provider_symbol_timestamp, idx_price_records_ingestion_timestamp,
-- price_records_pkey, idx_price_records_timestamp, idx_price_records_ttl,
-- idx_price_records_chain, and idx_price_records_failure_mode all serve live
-- query paths and are deliberately retained.
--
-- No unique constraint, foreign key, RLS policy, or check constraint depends on
-- this index: pg_constraint reports no 'f' rows for this table, and
-- relrowsecurity stays true.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

DROP INDEX IF EXISTS public.idx_price_records_metadata;

COMMIT;
