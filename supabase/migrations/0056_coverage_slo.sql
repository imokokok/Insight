-- Coverage readiness is sampled availability, not continuous uptime or trade safety.
BEGIN;
CREATE TABLE public.coverage_slo_targets (
  id text PRIMARY KEY,
  asset text NOT NULL,
  chain_id bigint NOT NULL CHECK (chain_id > 0),
  policy_id text NOT NULL CHECK (policy_id ~ '^0x[0-9a-f]{64}$'),
  objective_bps integer NOT NULL CHECK (objective_bps BETWEEN 1 AND 9999),
  enrolled_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(asset, chain_id, policy_id)
);
CREATE TABLE public.coverage_slo_samples (
  target_id text NOT NULL REFERENCES public.coverage_slo_targets(id),
  slot bigint NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  status text NOT NULL CHECK (status IN ('PASS','INSUFFICIENT_COVERAGE','UNAVAILABLE')),
  signed_ready boolean NOT NULL,
  reasons jsonb NOT NULL,
  proof jsonb,
  PRIMARY KEY(target_id, slot),
  CHECK (slot = floor(extract(epoch FROM recorded_at) / 900)::bigint * 900),
  CHECK (NOT signed_ready OR (status = 'PASS' AND proof IS NOT NULL)),
  CHECK (jsonb_typeof(reasons) = 'array')
);
ALTER TABLE public.coverage_slo_targets ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.coverage_sample_clock() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.recorded_at := clock_timestamp();
  RETURN NEW;
END $$;
CREATE TRIGGER coverage_sample_clock BEFORE INSERT ON public.coverage_slo_samples
  FOR EACH ROW EXECUTE FUNCTION public.coverage_sample_clock();
REVOKE ALL ON FUNCTION public.coverage_sample_clock() FROM PUBLIC, anon, authenticated;
ALTER TABLE public.coverage_slo_samples ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coverage_slo_targets, public.coverage_slo_samples FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.coverage_slo_targets, public.coverage_slo_samples TO service_role;
-- First result wins. No application UPDATE/DELETE grant: retries cannot erase failures.

CREATE FUNCTION public.coverage_slo_summary(window_hours integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE result jsonb;
BEGIN
  IF window_hours NOT IN (24,168,672) THEN RAISE EXCEPTION 'Unsupported SLO window'; END IF;
  WITH bounds AS (
    SELECT floor(extract(epoch FROM now()) / 900)::bigint * 900 AS end_slot
  ), windows AS (
    SELECT t.*, b.end_slot,
      greatest(ceil(extract(epoch FROM t.enrolled_at) / 900)::bigint * 900,
        b.end_slot - window_hours::bigint * 3600) AS start_slot
    FROM coverage_slo_targets t CROSS JOIN bounds b
  ), counts AS (
    SELECT w.id, w.asset, w.chain_id, w.policy_id, w.objective_bps, w.enrolled_at,
      w.start_slot, w.end_slot, greatest(0,(w.end_slot-w.start_slot)/900) AS expected,
      count(s.slot) AS observed,
      count(s.slot) FILTER (WHERE s.status='PASS') AS data_ready,
      count(s.slot) FILTER (WHERE s.signed_ready) AS signed_ready,
      count(s.slot) FILTER (WHERE s.status='UNAVAILABLE') AS unavailable
    FROM windows w LEFT JOIN coverage_slo_samples s ON s.target_id=w.id
      AND s.slot>=w.start_slot AND s.slot<w.end_slot
    GROUP BY w.id,w.asset,w.chain_id,w.policy_id,w.objective_bps,w.enrolled_at,w.start_slot,w.end_slot
  ) SELECT coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object(
    'missing', greatest(0,c.expected-c.observed),
    'latest', (SELECT jsonb_build_object('slot',s.slot,'status',s.status,'signedReady',s.signed_ready,
      'reasons',s.reasons,'providers',s.proof->'report'->'evaluation'->'providers')
      FROM coverage_slo_samples s WHERE s.target_id=c.id ORDER BY s.slot DESC LIMIT 1)
  ) ORDER BY c.asset,c.chain_id,c.policy_id),'[]'::jsonb) INTO result FROM counts c;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.coverage_slo_summary(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.coverage_slo_summary(integer) TO service_role;
COMMENT ON TABLE public.coverage_slo_samples IS '15-minute first-attempt sampled coverage. Missing complete slots count against readiness. Owner-managed retention must exceed 28 days.';
COMMIT;
