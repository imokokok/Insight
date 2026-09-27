-- Read-only resource snapshot. Compare deltas over matching workload windows;
-- do not reset global counters or interpret cumulative WAL as physical disk I/O.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SELECT jsonb_build_object(
  'measured_at',now(),
  'database_bytes',pg_database_size(current_database()),
  'database',(SELECT to_jsonb(s) FROM (
    SELECT stats_reset,blks_read,blks_hit,temp_files,temp_bytes,tup_inserted,tup_updated,tup_deleted,deadlocks
    FROM pg_stat_database WHERE datname=current_database()) s),
  'query_stats_reset',(SELECT stats_reset FROM extensions.pg_stat_statements_info),
  'tables',(SELECT jsonb_agg(to_jsonb(s)) FROM (
    SELECT relname,n_tup_ins,n_tup_upd,n_tup_del,n_dead_tup,last_autovacuum,
      pg_total_relation_size(relid) AS total_bytes
    FROM pg_stat_user_tables WHERE schemaname='public'
      AND relname IN ('price_snapshots','hourly_price_snapshots','price_records','oracle_feeds','snapshot_archives','oracle_rpc_metadata_cache')
    ORDER BY relname) s),
  'statements',(SELECT jsonb_agg(to_jsonb(s)) FROM (
    SELECT queryid::text,toplevel,calls,total_exec_time,rows,shared_blks_read,shared_blks_dirtied,temp_blks_written,wal_bytes,
      CASE WHEN query ILIKE '%hourly_price_snapshots%' THEN 'hourly_snapshots'
        WHEN query ILIKE '%price_snapshots%' THEN 'fine_snapshots'
        WHEN query ILIKE '%price_records%' THEN 'price_cache'
        WHEN query ILIKE '%oracle_feeds%' THEN 'feed_registry'
        ELSE 'rpc_metadata' END AS category
    FROM extensions.pg_stat_statements
    WHERE query NOT ILIKE '%pg_stat_statements%' AND
      (query ILIKE '%hourly_price_snapshots%' OR query ILIKE '%price_snapshots%'
       OR query ILIKE '%price_records%' OR query ILIKE '%oracle_feeds%'
       OR query ILIKE '%oracle_rpc_metadata_cache%')
    ORDER BY queryid) s)
) AS resource_baseline;
COMMIT;
