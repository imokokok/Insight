-- Migration 0022: Remove Pyth oracle provider data
--
-- Pyth Network is being removed from the platform (free data access via the
-- Hermes API is ending). This migration deletes all Pyth-related rows from
-- every provider-scoped table and updates the recalculate_all_reputations()
-- function so it no longer references Pyth.
--
-- Existing migrations (0002, 0004, 0012, 0016) are NOT modified — this
-- migration only performs data cleanup and a function redefinition.
--
-- Note: The Pyth Network contact entry in outreach_master_list.csv is retained
-- as a business resource (not a code integration).
-- Note: daily_reports.provider_rankings JSONB snapshots may historically
-- include Pyth entries; these are immutable point-in-time records and are
-- intentionally left unchanged as historical artifacts.

BEGIN;

-- ─── 1. Delete Pyth data from all provider-scoped tables ───────────

-- Feed metadata
DELETE FROM "public"."oracle_feeds" WHERE "provider" = 'pyth';

-- Aggregated reputation scores
DELETE FROM "public"."oracle_reputation" WHERE "provider" = 'pyth';

-- Per-fetch reputation samples
DELETE FROM "public"."reputation_history" WHERE "provider" = 'pyth';

-- Hourly price snapshots
DELETE FROM "public"."hourly_price_snapshots" WHERE "provider" = 'pyth';

-- Historical price records (TTL-managed cache)
DELETE FROM "public"."price_records" WHERE "provider" = 'pyth';

-- User-configured price alerts targeting Pyth
DELETE FROM "public"."price_alerts" WHERE "provider" = 'pyth';

-- ─── 2. Update recalculate_all_reputations() ───────────────────────
-- Remove the ('pyth', 400, 'api') row from the provider config VALUES table.
-- This is the current definition (supersedes the versions in 0004 and 0012).

CREATE OR REPLACE FUNCTION "public"."recalculate_all_reputations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_provider TEXT;
  v_baseline INTEGER;
  v_type TEXT;
  v_count INTEGER := 0;
BEGIN
  -- Single pass: UNION providers with recent history and providers already
  -- in oracle_reputation, then LEFT JOIN the config table so unknown
  -- providers still get the default (1000, 'api') fallback.
  FOR v_provider, v_baseline, v_type IN
    SELECT ap.provider,
           COALESCE(pc.baseline, 1000),
           COALESCE(pc.ptype, 'api')
    FROM (
      SELECT DISTINCT provider FROM public.reputation_history
      WHERE snapshot_time >= NOW() - INTERVAL '7 days'
      UNION
      SELECT provider FROM public.oracle_reputation
    ) ap
    LEFT JOIN (VALUES
      ('flare',     1500, 'onchain'),
      ('chainlink', 1200, 'onchain'),
      ('api3',      1000, 'onchain'),
      ('twap',      1400, 'onchain'),
      ('winklink',  1200, 'onchain'),
      ('reflector', 1200, 'onchain'),
      ('redstone',   350, 'api'),
      ('dia',        500, 'api'),
      ('supra',      500, 'api')
    ) AS pc(provider, baseline, ptype) ON pc.provider = ap.provider
  LOOP
    PERFORM public.aggregate_oracle_reputation_v4(v_provider, 7, v_baseline, v_type);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Recalculated reputations for % providers using V4 algorithm', v_count;
  RETURN v_count;
END;
$$;

ALTER FUNCTION "public"."recalculate_all_reputations"() OWNER TO "postgres";

COMMIT;
