-- Optimize recalculate_all_reputations(): merge two duplicated loops into
-- one and replace the hand-maintained CASE statement (copy-pasted twice)
-- with a VALUES join.
--
-- Behaviour is identical: every provider from reputation_history (recent)
-- OR oracle_reputation (existing) is aggregated with the same (baseline,
-- type) parameters as before — including the ELSE fallback (baseline=1000,
-- type='api') for providers not explicitly listed.
--
-- What changes:
--   1. The duplicated 30-line CASE block is gone (single source of truth).
--   2. reputation_history is scanned once instead of twice (UNION + LEFT
--      JOIN replaces two subqueries in separate loops).
--   3. Adding a new provider only requires one row in the VALUES table.

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
  -- providers still get the default (1000, 'api') fallback — matching the
  -- original ELSE branch.
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
      ('pyth',       400, 'api'),
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
