-- Compare archived observation timestamps as instants, independent of the
-- writer session timezone. Replays must not duplicate a natural key.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.archive_snapshot_day(p_day date)
RETURNS TABLE(moved_price bigint, moved_hourly bigint, archive_rows bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE
  utc_today date := (now() AT TIME ZONE 'UTC')::date;
  source_name text;
  kind_name text;
  timestamp_name text;
  group_row record;
  previous jsonb;
  merged jsonb;
  copied jsonb;
  deleted_count bigint;
  expected_count bigint;
  collected_ids bigint[];
BEGIN
  IF p_day IS NULL OR p_day >= utc_today - 7 OR p_day < utc_today - 120 THEN
    RAISE EXCEPTION 'Archive day must be inside the retained cold window';
  END IF;
  IF NOT pg_try_advisory_xact_lock(192736, 64) THEN
    RAISE EXCEPTION 'Snapshot archive maintenance is already running';
  END IF;
  moved_price := 0; moved_hourly := 0;
  FOR source_name, kind_name, timestamp_name IN
    VALUES ('price_snapshots','price','snapshot_ts'),
           ('hourly_price_snapshots','hourly','snapshot_hour')
  LOOP
    collected_ids := ARRAY[]::bigint[];
    expected_count := 0;
    FOR group_row IN EXECUTE format($source$
      WITH locked AS MATERIALIZED (
        SELECT * FROM public.%I WHERE %I >= ($1::date::timestamp AT TIME ZONE 'UTC')
          AND %I < (($1::date + 1)::timestamp AT TIME ZONE 'UTC') FOR UPDATE)
      SELECT provider, symbol, chain_id,
        jsonb_agg(to_jsonb(locked) ORDER BY %I, id) AS entries, array_agg(id) AS ids
      FROM locked GROUP BY provider, symbol, chain_id
      ORDER BY provider, symbol, chain_id
    $source$, source_name, timestamp_name, timestamp_name, timestamp_name) USING p_day
    LOOP
      SELECT a.entries INTO previous FROM public.snapshot_archives a
      WHERE a.kind=kind_name AND a.archive_day=p_day AND a.provider=group_row.provider
        AND a.symbol=group_row.symbol AND a.chain_id=group_row.chain_id FOR UPDATE;
      -- New source rows win on a replay, exactly as the history views do. All
      -- non-overlapping archived observations and failed probes are retained.
      SELECT jsonb_agg(item ORDER BY (item->>timestamp_name)::timestamptz,
        (item->>'id')::bigint) INTO merged FROM (
        SELECT DISTINCT ON ((item->>timestamp_name)::timestamptz) item FROM (
          SELECT item, 0 AS priority FROM jsonb_array_elements(group_row.entries) item
          UNION ALL
          SELECT item, 1 AS priority FROM jsonb_array_elements(coalesce(previous,'[]')) item
        ) candidates ORDER BY (item->>timestamp_name)::timestamptz, priority
      ) unique_rows;
      INSERT INTO public.snapshot_archives AS a(kind,archive_day,provider,symbol,chain_id,entries,checksum)
        VALUES(kind_name,p_day,group_row.provider,group_row.symbol,group_row.chain_id,merged,
          encode(sha256(convert_to(merged::text,'UTF8')),'hex'))
      ON CONFLICT(kind,archive_day,provider,symbol,chain_id) DO UPDATE SET entries=EXCLUDED.entries,checksum=EXCLUDED.checksum;
      SELECT a.entries INTO copied FROM public.snapshot_archives a
      WHERE a.kind=kind_name AND a.archive_day=p_day AND a.provider=group_row.provider
        AND a.symbol=group_row.symbol AND a.chain_id=group_row.chain_id;
      IF copied IS DISTINCT FROM merged OR NOT copied @> group_row.entries THEN
        RAISE EXCEPTION 'Archive verification failed; source rows retained';
      END IF;
      collected_ids := collected_ids || group_row.ids;
      expected_count := expected_count + jsonb_array_length(group_row.entries);
    END LOOP;
    IF expected_count > 0 THEN
      -- One delete per source/day, with timestamp pruning and the exact locked
      -- ID set. Rows inserted after the source snapshot cannot be removed.
      EXECUTE format('DELETE FROM public.%I WHERE id=ANY($1)
        AND %I >= ($2::date::timestamp AT TIME ZONE ''UTC'')
        AND %I < (($2::date+1)::timestamp AT TIME ZONE ''UTC'')',
        source_name,timestamp_name,timestamp_name) USING collected_ids,p_day;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      IF deleted_count <> expected_count THEN
        RAISE EXCEPTION 'Archive source count changed; transaction rolled back';
      END IF;
      IF kind_name='price' THEN moved_price := deleted_count;
      ELSE moved_hourly := deleted_count; END IF;
    END IF;
  END LOOP;
  SELECT coalesce(sum(a.row_count),0)::bigint INTO archive_rows
    FROM public.snapshot_archives a WHERE a.archive_day=p_day;
  RETURN NEXT;
END;
$function$;
REVOKE ALL ON FUNCTION public.archive_snapshot_day(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_snapshot_day(date) TO service_role;


COMMIT;
