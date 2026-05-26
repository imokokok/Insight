-- ============================================
-- Update cron job to use V2 reputation algorithm
-- ============================================

-- Update recalculate_all_reputations to use V2 with provider-specific baselines
CREATE OR REPLACE FUNCTION public.recalculate_all_reputations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider TEXT;
  v_count INTEGER := 0;
  v_baseline INTEGER;
  v_type TEXT;
BEGIN
  FOR v_provider IN
    SELECT DISTINCT provider FROM public.reputation_history
    WHERE snapshot_time >= NOW() - INTERVAL '7 days'
  LOOP
    -- Set provider-specific baseline
    CASE v_provider
      WHEN 'flare' THEN
        v_baseline := 2000;
        v_type := 'onchain';
      WHEN 'chainlink' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'api3' THEN
        v_baseline := 1200;
        v_type := 'onchain';
      WHEN 'twap' THEN
        v_baseline := 1800;
        v_type := 'onchain';
      WHEN 'winklink' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'reflector' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'redstone' THEN
        v_baseline := 300;
        v_type := 'api';
      WHEN 'pyth' THEN
        v_baseline := 400;
        v_type := 'api';
      WHEN 'dia' THEN
        v_baseline := 500;
        v_type := 'api';
      WHEN 'supra' THEN
        v_baseline := 500;
        v_type := 'api';
      ELSE
        v_baseline := 1000;
        v_type := 'api';
    END CASE;

    PERFORM public.aggregate_oracle_reputation_v2(v_provider, 7, v_baseline, v_type);
    v_count := v_count + 1;
  END LOOP;

  FOR v_provider IN
    SELECT provider FROM public.oracle_reputation
    WHERE provider NOT IN (
      SELECT DISTINCT provider FROM public.reputation_history
      WHERE snapshot_time >= NOW() - INTERVAL '7 days'
    )
  LOOP
    CASE v_provider
      WHEN 'flare' THEN
        v_baseline := 2000;
        v_type := 'onchain';
      WHEN 'chainlink' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'api3' THEN
        v_baseline := 1200;
        v_type := 'onchain';
      WHEN 'twap' THEN
        v_baseline := 1800;
        v_type := 'onchain';
      WHEN 'winklink' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'reflector' THEN
        v_baseline := 1500;
        v_type := 'onchain';
      WHEN 'redstone' THEN
        v_baseline := 300;
        v_type := 'api';
      WHEN 'pyth' THEN
        v_baseline := 400;
        v_type := 'api';
      WHEN 'dia' THEN
        v_baseline := 500;
        v_type := 'api';
      WHEN 'supra' THEN
        v_baseline := 500;
        v_type := 'api';
      ELSE
        v_baseline := 1000;
        v_type := 'api';
    END CASE;

    PERFORM public.aggregate_oracle_reputation_v2(v_provider, 7, v_baseline, v_type);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Recalculated reputations for % providers using V2 algorithm', v_count;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.recalculate_all_reputations() IS
  'Re-aggregates reputation scores for all providers using V2 algorithm with provider-type-aware latency normalization.';
