-- Migration 0032: per-feed observed cadence for cadence-relative staleness
--
-- Adds two columns to oracle_feeds that cache each feed's observed update cadence
-- (p90 of price_snapshots.data_age_seconds). The pre-trade staleness gate then
-- compares a feed's CURRENT oracle age against ITS OWN cadence instead of an
-- absolute wall-clock threshold, so naturally-slow sources (e.g. API3's ~24h
-- cadence) are never falsely flagged stale, while a feed that suddenly falls
-- ~8x behind its own normal rhythm is surfaced as a soft CAUTION (never a hard
-- BLOCK).
--
-- Backfilled by src/lib/oracles/feedCadence.ts updateAllFeedStalenessBaselines
-- (run on a schedule). Until backfilled the columns are NULL — pre-trade treats
-- "no observed cadence" as "not stale" (safe default; the 7-day absolute
-- hard-block backstop in THRESHOLDS.dataStaleSeconds.block still applies).
--
-- Idempotent: safe to re-run (ADD COLUMN IF NOT EXISTS).

BEGIN;

ALTER TABLE "public"."oracle_feeds"
  ADD COLUMN IF NOT EXISTS "observed_data_age_p90_s" integer,
  ADD COLUMN IF NOT EXISTS "observed_cadence_updated_at" timestamp with time zone;

COMMENT ON COLUMN "public"."oracle_feeds"."observed_data_age_p90_s" IS
  'Observed update cadence: p90 of price_snapshots.data_age_seconds over the trailing window. '
  || 'NULL until backfilled. Consumed by the cadence-relative staleness gate (feedCadence.isCadenceStale).';

COMMENT ON COLUMN "public"."oracle_feeds"."observed_cadence_updated_at" IS
  'When observed_data_age_p90_s was last recomputed by updateAllFeedStalenessBaselines.';

COMMIT;

-- -----------------------------------------------------------------------------
-- Scheduled backfill of the cadence baselines.
--
-- Without this, observed_data_age_p90_s stays NULL forever and the cadence
-- CAUTION path never activates (only the 7-day absolute block would work).
-- Mirrors the reputation-fetch pattern: a SECURITY DEFINER SQL fn calls the app
-- cron endpoint via pg_net, and pg_cron fires it on a daily schedule.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."trigger_feed_cadence_backfill"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_app_url TEXT;
  v_cron_secret TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT value INTO v_app_url FROM public.cron_config WHERE key = 'next_public_app_url';
  SELECT value INTO v_cron_secret FROM public.cron_config WHERE key = 'cron_secret';

  IF v_app_url IS NULL OR v_app_url = '' THEN
    RAISE NOTICE 'next_public_app_url not configured in cron_config, skipping feed-cadence backfill';
    RETURN;
  END IF;

  SELECT INTO v_request_id net.http_get(
    url := v_app_url || '/api/cron/feed-cadence',
    headers := jsonb_build_object(
      'Authorization', CASE
        WHEN v_cron_secret IS NOT NULL AND v_cron_secret != ''
        THEN 'Bearer ' || v_cron_secret
        ELSE ''
      END
    ),
    timeout_milliseconds := 60000
  );

  RAISE NOTICE 'Feed-cadence baseline backfill triggered via pg_net, request_id: %', v_request_id;
END;
$$;

ALTER FUNCTION "public"."trigger_feed_cadence_backfill"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."trigger_feed_cadence_backfill"() IS
  'Triggers the daily oracle_feed staleness-baseline backfill by calling /api/cron/feed-cadence via pg_net.';

-- Idempotent schedule registration (unschedule first to avoid duplicates).
SELECT cron.unschedule('feed-cadence-baselines')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'feed-cadence-baselines');

SELECT cron.schedule(
  'feed-cadence-baselines',
  '0 2 * * *',
  $$ SELECT public.trigger_feed_cadence_backfill(); $$
);
