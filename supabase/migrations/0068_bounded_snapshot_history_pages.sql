BEGIN;

-- Expand only the UTC dates required for a page. A scalar JSON result also
-- preserves the API's 10,000-row limit independently of PostgREST's row cap.
CREATE OR REPLACE FUNCTION public.get_snapshot_history_page(
  p_kind text, p_from timestamptz, p_before timestamptz, p_columns text[],
  p_providers text[] DEFAULT NULL, p_symbol text DEFAULT NULL,
  p_chain_id integer DEFAULT NULL, p_success_only boolean DEFAULT false,
  p_ascending boolean DEFAULT false, p_limit integer DEFAULT 1000,
  p_offset bigint DEFAULT 0, p_inclusive_before boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  source_name text; history_name text; time_name text; direction text;
  projection text; filters text; page_sql text; days_sql text;
  allowed_columns text[] := ARRAY['id','snapshot_hour','provider','symbol','chain_id',
    'price','consensus_price','deviation_pct','latency_ms','data_age_seconds',
    'confidence','is_success','error_message','created_at'];
  result jsonb := '[]'::jsonb; batch jsonb; day_info record;
  min_archive date; max_archive date; hot_edge timestamptz;
  day_start timestamptz; day_end timestamptz; day_count bigint;
  remaining_offset bigint := p_offset; remaining_limit integer := p_limit;
BEGIN
  IF p_kind = 'price' THEN
    source_name := 'price_snapshots'; history_name := 'price_snapshot_history';
    time_name := 'snapshot_ts'; allowed_columns := allowed_columns || ARRAY['snapshot_ts'];
  ELSIF p_kind = 'hourly' THEN
    source_name := 'hourly_price_snapshots'; history_name := 'hourly_snapshot_history';
    time_name := 'snapshot_hour';
  ELSE RAISE EXCEPTION 'Invalid snapshot kind'; END IF;
  IF p_from IS NULL OR p_before IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_before)
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 10001
    OR p_offset IS NULL OR p_offset < 0 OR p_columns IS NULL
    OR cardinality(p_columns) = 0 OR NOT p_columns <@ allowed_columns
    OR array_position(p_columns,NULL) IS NOT NULL
    OR p_ascending IS NULL OR p_success_only IS NULL OR p_inclusive_before IS NULL THEN
    RAISE EXCEPTION 'Invalid snapshot page parameters';
  END IF;
  IF p_before < p_from OR (p_before = p_from AND NOT p_inclusive_before) THEN RETURN result; END IF;
  SELECT string_agg(format('%L,s.%I',column_name,column_name),',') INTO projection
    FROM unnest(p_columns) AS c(column_name);
  direction := CASE WHEN p_ascending THEN 'ASC' ELSE 'DESC' END;
  filters := format('s.%I >= $1 AND s.%I %s $2',time_name,time_name,
    CASE WHEN p_inclusive_before THEN '<=' ELSE '<' END);
  IF p_providers IS NOT NULL THEN filters := filters || ' AND s.provider = ANY($3)'; END IF;
  IF p_symbol IS NOT NULL THEN filters := filters || ' AND s.symbol = $4'; END IF;
  IF p_chain_id IS NOT NULL THEN filters := filters || ' AND s.chain_id = $5'; END IF;
  IF p_success_only THEN
    filters := filters || ' AND s.is_success AND s.price > 0 AND s.price::text NOT IN (''NaN'',''Infinity'',''-Infinity'')';
  END IF;
  page_sql := format('SELECT coalesce(jsonb_agg(q.row),''[]''::jsonb) FROM
    (SELECT jsonb_build_object(%s) AS row FROM public.%%I s WHERE %s %%s
      ORDER BY s.%I %s,s.id %s LIMIT $6 OFFSET $7) q',
    projection,filters,time_name,direction,direction);

  SELECT min(a.archive_day),max(a.archive_day) INTO min_archive,max_archive
    FROM public.snapshot_archives a WHERE a.kind=p_kind
      AND a.archive_day >= (p_from AT TIME ZONE 'UTC')::date
      AND a.archive_day <= (p_before AT TIME ZONE 'UTC')::date
      AND (p_providers IS NULL OR a.provider=ANY(p_providers))
      AND (p_symbol IS NULL OR a.symbol=p_symbol)
      AND (p_chain_id IS NULL OR a.chain_id=p_chain_id);
  -- Recent pages stay on the original indexed table, with no JSON expansion.
  EXECUTE format(page_sql,source_name,'') INTO batch
    USING p_from,p_before,p_providers,p_symbol,p_chain_id,p_limit,p_offset;
  IF min_archive IS NULL THEN RETURN batch; END IF;
  IF jsonb_array_length(batch)=p_limit THEN
    SELECT CASE WHEN p_ascending THEN max((entry->>time_name)::timestamptz)
      ELSE min((entry->>time_name)::timestamptz) END INTO hot_edge
      FROM jsonb_array_elements(batch) entry;
    -- The time field is not necessarily projected; derive it separately then.
    IF hot_edge IS NULL THEN
      EXECUTE format('SELECT %s(t) FROM (SELECT s.%I AS t FROM public.%I s WHERE %s
        ORDER BY s.%I %s,s.id %s LIMIT $6 OFFSET $7) q',
        CASE WHEN p_ascending THEN 'max' ELSE 'min' END,time_name,source_name,filters,
        time_name,direction,direction) INTO hot_edge
        USING p_from,p_before,p_providers,p_symbol,p_chain_id,p_limit,p_offset;
    END IF;
    IF (NOT p_ascending AND hot_edge >= ((max_archive+1)::timestamp AT TIME ZONE 'UTC'))
      OR (p_ascending AND hot_edge < (min_archive::timestamp AT TIME ZONE 'UTC')) THEN
      RETURN batch;
    END IF;
  END IF;
  days_sql := format('WITH hot AS (
    SELECT (s.%I AT TIME ZONE ''UTC'')::date AS day,count(*) AS n
      FROM public.%I s WHERE %s GROUP BY 1
    ), cold AS (
    SELECT a.archive_day AS day,sum(a.row_count) AS n FROM public.snapshot_archives a
      WHERE a.kind=$6 AND a.archive_day >= ($1 AT TIME ZONE ''UTC'')::date
      AND a.archive_day <= ($2 AT TIME ZONE ''UTC'')::date
      AND ($3 IS NULL OR a.provider=ANY($3)) AND ($4 IS NULL OR a.symbol=$4)
      AND ($5 IS NULL OR a.chain_id=$5) GROUP BY 1)
    SELECT coalesce(hot.day,cold.day) AS day,coalesce(hot.n,0) AS hot_count,
      coalesce(cold.n,0) AS cold_count FROM hot FULL JOIN cold USING(day) ORDER BY day %s',
    time_name,source_name,filters,direction);
  FOR day_info IN EXECUTE days_sql USING p_from,p_before,p_providers,p_symbol,p_chain_id,p_kind LOOP
    day_start := day_info.day::timestamp AT TIME ZONE 'UTC';
    day_end := (day_info.day+1)::timestamp AT TIME ZONE 'UTC';
    IF remaining_offset > 0 THEN
      IF day_info.cold_count=0 THEN day_count := day_info.hot_count;
      ELSIF day_info.hot_count=0 AND NOT p_success_only AND day_start>=p_from AND day_end<=p_before THEN
        day_count := day_info.cold_count;
      ELSE
        EXECUTE format('SELECT count(*) FROM public.%I s WHERE %s
          AND s.archive_day=$6 AND s.%I >= $7 AND s.%I < $8',history_name,filters,time_name,time_name)
          INTO day_count USING p_from,p_before,p_providers,p_symbol,p_chain_id,day_info.day,day_start,day_end;
      END IF;
      IF remaining_offset >= day_count THEN remaining_offset := remaining_offset-day_count; CONTINUE; END IF;
    END IF;
    EXECUTE format(page_sql,history_name,format('AND s.archive_day=$8 AND s.%I >= $9 AND s.%I < $10',time_name,time_name))
      INTO batch USING p_from,p_before,p_providers,p_symbol,p_chain_id,
        remaining_limit,remaining_offset,day_info.day,day_start,day_end;
    result := result || batch;
    remaining_limit := remaining_limit-jsonb_array_length(batch); remaining_offset := 0;
    EXIT WHEN remaining_limit=0;
  END LOOP;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.get_snapshot_history_page(text,timestamptz,timestamptz,text[],text[],text,integer,boolean,boolean,integer,bigint,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_snapshot_history_page(text,timestamptz,timestamptz,text[],text[],text,integer,boolean,boolean,integer,bigint,boolean) TO service_role;

-- Return aggregate reliability evidence once, rather than transferring every
-- hourly observation or silently aggregating PostgREST's first 1,000 rows.
CREATE OR REPLACE FUNCTION public.get_snapshot_uptime(
  p_from timestamptz,p_before timestamptz,p_providers text[] DEFAULT NULL,p_symbol text DEFAULT NULL
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.provider,q.symbol),'[]'::jsonb) FROM (
    SELECT s.provider,s.symbol,count(*) AS snapshots,
      count(*) FILTER(WHERE s.is_success) AS successes,
      count(DISTINCT date_trunc('hour',s.snapshot_hour AT TIME ZONE 'UTC')) AS hours
    FROM public.hourly_snapshot_history s
    WHERE s.snapshot_hour>=p_from AND s.snapshot_hour<p_before
      AND s.archive_day>=(p_from AT TIME ZONE 'UTC')::date
      AND s.archive_day<=(p_before AT TIME ZONE 'UTC')::date
      AND (p_providers IS NULL OR s.provider=ANY(p_providers))
      AND (p_symbol IS NULL OR s.symbol=p_symbol)
    GROUP BY s.provider,s.symbol
  ) q;
$$;
REVOKE ALL ON FUNCTION public.get_snapshot_uptime(timestamptz,timestamptz,text[],text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_snapshot_uptime(timestamptz,timestamptz,text[],text) TO service_role;

COMMIT;
