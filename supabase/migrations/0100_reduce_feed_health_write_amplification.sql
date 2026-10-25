-- Keep the feed-health registry current without rewriting a wide registry row
-- for every successful API read. The user-facing stale threshold is two hours,
-- so one confirmed success per 15 minutes keeps substantially finer fidelity
-- while collapsing request bursts and duplicate cron deliveries into no-ops.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- `oracle_feeds` is deliberately a wide registry row (metadata contains
-- provider-specific routing evidence). It also receives mutable health fields.
-- Reclaim short-lived update tuples early so that the catalog stays cached
-- instead of becoming a vacuum-sized scan on Nano.
ALTER TABLE public.oracle_feeds SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 100,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 100
);
ALTER TABLE public.oracle_rpc_metadata_cache SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 25,
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_analyze_threshold = 25
);

-- Cold archive readers filter by kind/day and then advance by archive_id. The
-- primary key cannot satisfy that cursor order without re-sorting each date
-- range; this narrow index keeps bounded archive reads off the large JSONB
-- payload heap until a matching chunk is selected.
CREATE INDEX IF NOT EXISTS snapshot_archives_kind_day_id_idx
  ON public.snapshot_archives (kind, archive_day, archive_id);

-- Record a realtime success immediately after a failure, then at most once in
-- each 15-minute collection interval. Successful repeat reads in that window
-- have no new health information and used to rewrite the same wide row.
CREATE OR REPLACE FUNCTION public.touch_oracle_feed_success(
  p_provider text,
  p_symbol text,
  p_chain_id integer,
  p_success_at timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH updated AS (
    UPDATE public.oracle_feeds AS feed
    SET consecutive_failures = 0,
        last_success_at = p_success_at,
        updated_at = p_success_at
    WHERE p_provider IS NOT NULL
      AND p_symbol IS NOT NULL
      AND p_chain_id IS NOT NULL
      AND p_success_at IS NOT NULL
      AND feed.provider = p_provider
      AND feed.symbol = p_symbol
      AND feed.chain_id = p_chain_id
      AND (
        feed.consecutive_failures <> 0
        OR feed.last_success_at IS NULL
        OR feed.last_success_at < p_success_at - interval '15 minutes'
      )
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$function$;
REVOKE ALL ON FUNCTION public.touch_oracle_feed_success(text,text,integer,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_oracle_feed_success(text,text,integer,timestamptz)
  TO service_role;

-- The batch collector keeps its exact success/failure semantics, while a
-- duplicated invocation inside the same collection interval no longer creates
-- one update tuple per successful probe. Failures still increment immediately.
CREATE OR REPLACE FUNCTION public.batch_update_feed_health(p_results jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE total_updated bigint := 0; step_updated bigint; now_ts timestamptz := now();
BEGIN
  WITH probes AS MATERIALIZED (
    SELECT rec->>'provider' AS provider, rec->>'symbol' AS symbol,
      (rec->>'chainId')::integer AS chain_id, count(*) AS multiplicity
    FROM jsonb_array_elements(coalesce(p_results->'successes','[]'::jsonb)) rec
    GROUP BY 1,2,3
  ), updated AS (
    UPDATE public.oracle_feeds feed SET consecutive_failures=0,
      last_success_at=now_ts, updated_at=now_ts
    FROM probes WHERE feed.provider=probes.provider AND feed.symbol=probes.symbol
      AND feed.chain_id=probes.chain_id
      AND (
        feed.consecutive_failures <> 0
        OR feed.last_success_at IS NULL
        OR feed.last_success_at < now_ts - interval '15 minutes'
      )
    RETURNING probes.multiplicity
  ) SELECT coalesce(sum(multiplicity),0) INTO total_updated FROM updated;
  WITH probes AS MATERIALIZED (
    SELECT rec->>'provider' AS provider, rec->>'symbol' AS symbol,
      (rec->>'chainId')::integer AS chain_id, count(*) AS multiplicity
    FROM jsonb_array_elements(coalesce(p_results->'failures','[]'::jsonb)) rec
    GROUP BY 1,2,3
  ), updated AS (
    UPDATE public.oracle_feeds feed
    SET consecutive_failures=feed.consecutive_failures+probes.multiplicity::integer,
      last_failure_at=now_ts, updated_at=now_ts
    FROM probes WHERE feed.provider=probes.provider AND feed.symbol=probes.symbol
      AND feed.chain_id=probes.chain_id
    RETURNING probes.multiplicity
  ) SELECT coalesce(sum(multiplicity),0) INTO step_updated FROM updated;
  RETURN (total_updated+step_updated)::integer;
END;
$function$;
REVOKE ALL ON FUNCTION public.batch_update_feed_health(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.batch_update_feed_health(jsonb) TO service_role;

COMMIT;
