-- Additive rollout: readers must use the history views BEFORE archiving is enabled.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.snapshot_archives (
  archive_id bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  kind text NOT NULL CHECK (kind IN ('price', 'hourly')),
  archive_day date NOT NULL,
  provider text NOT NULL,
  symbol text NOT NULL,
  chain_id integer NOT NULL,
  entries jsonb NOT NULL CHECK (jsonb_typeof(entries) = 'array'),
  row_count integer GENERATED ALWAYS AS (jsonb_array_length(entries)) STORED,
  checksum text NOT NULL CHECK
    (checksum = encode(sha256(convert_to(entries::text, 'UTF8')), 'hex')),
  PRIMARY KEY (kind, archive_day, provider, symbol, chain_id)
);
ALTER TABLE public.snapshot_archives ALTER COLUMN entries SET STORAGE EXTENDED;
ALTER TABLE public.snapshot_archives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS snapshot_archives_service ON public.snapshot_archives;
CREATE POLICY snapshot_archives_service ON public.snapshot_archives FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.snapshot_archives FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.snapshot_archives TO service_role;
GRANT USAGE ON SEQUENCE public.snapshot_archives_archive_id_seq TO service_role;

-- Explicit group metadata lets day/provider/symbol predicates prune compressed
-- chunks BEFORE decompressing them. Native row types preserve every source field.
DO $migration$
DECLARE
  source_name text;
  kind_name text;
  timestamp_name text;
  columns_sql text;
BEGIN
  FOR source_name, kind_name, timestamp_name IN
    VALUES ('price_snapshots', 'price', 'snapshot_ts'),
           ('hourly_price_snapshots', 'hourly', 'snapshot_hour')
  LOOP
    SELECT string_agg(
      CASE WHEN attname IN ('provider','symbol','chain_id')
        THEN format('a.%I', attname) ELSE format('s.%I', attname) END,
      ', ' ORDER BY attnum)
    INTO columns_sql FROM pg_attribute
    WHERE attrelid = format('public.%I', source_name)::regclass
      AND attnum > 0 AND NOT attisdropped;
    EXECUTE format($view$
      CREATE OR REPLACE VIEW public.%I WITH (security_invoker = true) AS
        SELECT h.*, (h.%I AT TIME ZONE 'UTC')::date AS archive_day
        FROM public.%I h
        UNION ALL
        SELECT %s, a.archive_day
        FROM public.snapshot_archives a
        CROSS JOIN LATERAL jsonb_populate_recordset(NULL::public.%I, a.entries) s
        WHERE a.kind = %L
          AND NOT EXISTS (
            SELECT 1 FROM public.%I h WHERE h.%I = s.%I
              AND h.provider = a.provider AND h.symbol = a.symbol
              AND h.chain_id = a.chain_id)
    $view$, CASE WHEN kind_name='price' THEN 'price_snapshot_history'
      ELSE 'hourly_snapshot_history' END,
      timestamp_name, source_name, columns_sql, source_name, kind_name,
      source_name, timestamp_name, timestamp_name);
  END LOOP;
END;
$migration$;
REVOKE ALL ON public.price_snapshot_history, public.hourly_snapshot_history
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.price_snapshot_history, public.hourly_snapshot_history TO service_role;

CREATE OR REPLACE VIEW public.snapshot_archive_exports WITH (security_invoker = true) AS
  SELECT archive_id,kind,archive_day,provider,symbol,chain_id,row_count,checksum,entries::text AS payload
  FROM public.snapshot_archives;
REVOKE ALL ON public.snapshot_archive_exports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.snapshot_archive_exports TO service_role;

-- One UTC day per transaction; readers see either the source or its verified
-- compressed copy. Row locks protect against concurrent hourly upserts.
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
    FOR group_row IN EXECUTE format($source$
      WITH locked AS MATERIALIZED (
        SELECT * FROM public.%I WHERE %I >= ($1::date::timestamp AT TIME ZONE 'UTC')
          AND %I < (($1::date + 1)::timestamp AT TIME ZONE 'UTC') FOR UPDATE)
      SELECT provider, symbol, chain_id,
        jsonb_agg(to_jsonb(locked) ORDER BY %I, id) AS entries
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
        SELECT DISTINCT ON (item->>timestamp_name) item FROM (
          SELECT item, 0 AS priority FROM jsonb_array_elements(group_row.entries) item
          UNION ALL
          SELECT item, 1 AS priority FROM jsonb_array_elements(coalesce(previous,'[]')) item
        ) candidates ORDER BY item->>timestamp_name, priority
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
      expected_count := jsonb_array_length(group_row.entries);
      EXECUTE format('DELETE FROM public.%I WHERE id IN
        (SELECT (item->>''id'')::bigint FROM jsonb_array_elements($1) item)', source_name)
        USING group_row.entries;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      IF deleted_count <> expected_count THEN
        RAISE EXCEPTION 'Archive source count changed; transaction rolled back';
      END IF;
      IF kind_name='price' THEN moved_price := moved_price + deleted_count;
      ELSE moved_hourly := moved_hourly + deleted_count; END IF;
    END LOOP;
  END LOOP;
  SELECT coalesce(sum(a.row_count),0)::bigint INTO archive_rows
    FROM public.snapshot_archives a WHERE a.archive_day=p_day;
  RETURN NEXT;
END;
$function$;
REVOKE ALL ON FUNCTION public.archive_snapshot_day(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_snapshot_day(date) TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_oracle_feed_cadence_baselines(
  p_lookback_hours integer DEFAULT 48,
  p_min_samples integer DEFAULT 12
)
RETURNS TABLE(updated_count bigint, scanned_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH params AS MATERIALIZED (
    SELECT
      now() AS computed_at,
      now() - make_interval(
        hours => greatest(1, least(coalesce(p_lookback_hours, 48), 720))
      ) AS since,
      greatest(1, least(coalesce(p_min_samples, 12), 10000))::bigint AS min_samples
  ),
  active_feeds AS MATERIALIZED (
    SELECT provider, symbol, chain_id
    FROM public.oracle_feeds
    WHERE is_active = true
  ),
  trusted_samples AS MATERIALIZED (
    SELECT
      feed.provider,
      feed.symbol,
      feed.chain_id,
      count(snapshot.data_age_seconds)::bigint AS sample_count,
      round(
        percentile_cont(0.9) WITHIN GROUP (ORDER BY snapshot.data_age_seconds)
      )::integer AS p90_seconds
    FROM active_feeds AS feed
    CROSS JOIN params
    JOIN public.price_snapshot_history AS snapshot
      ON snapshot.provider = feed.provider
     AND snapshot.symbol = feed.symbol
     AND snapshot.chain_id = feed.chain_id
     AND snapshot.snapshot_ts >= params.since
     AND snapshot.archive_day >= (params.since AT TIME ZONE 'UTC')::date
     AND snapshot.data_age_seconds IS NOT NULL
     AND snapshot.data_age_seconds >= 0
    WHERE feed.provider = ANY (
      ARRAY[
        'chainlink',
        'api3',
        'supra',
        'twap',
        'flare',
        'switchboard',
        'winklink'
      ]::text[]
    )
    GROUP BY feed.provider, feed.symbol, feed.chain_id
  ),
  baselines AS MATERIALIZED (
    SELECT
      feed.provider,
      feed.symbol,
      feed.chain_id,
      CASE
        WHEN coalesce(sample.sample_count, 0) >= params.min_samples
          THEN sample.p90_seconds
        ELSE NULL
      END AS p90_seconds,
      params.computed_at
    FROM active_feeds AS feed
    CROSS JOIN params
    LEFT JOIN trusted_samples AS sample
      ON sample.provider = feed.provider
     AND sample.symbol = feed.symbol
     AND sample.chain_id = feed.chain_id
  ),
  updated AS (
    UPDATE public.oracle_feeds AS feed
    SET
      observed_data_age_p90_s = baseline.p90_seconds,
      observed_cadence_updated_at = baseline.computed_at
    FROM baselines AS baseline
    WHERE feed.provider = baseline.provider
      AND feed.symbol = baseline.symbol
      AND feed.chain_id = baseline.chain_id
      AND feed.is_active = true
    RETURNING 1
  )
  SELECT
    (SELECT count(*) FROM updated) AS updated_count,
    (SELECT count(*) FROM active_feeds) AS scanned_count;
$$;


COMMENT ON TABLE public.snapshot_archives IS
  'Lossless per-feed UTC-day snapshot chunks, using native TOAST compression. 120-day retention; original rows exposed through private history views.';
NOTIFY pgrst, 'reload schema';
COMMIT;
