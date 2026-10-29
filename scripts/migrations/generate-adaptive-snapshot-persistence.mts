import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The fine-grained collector samples every feed every 15 minutes, but storing
// every unchanged observation was the largest recurring source of database WAL
// and index I/O. Keep full resolution where it matters most; write adaptive
// feeds on a fixed hourly baseline plus material changes and state transitions.
const migrationSql = String.raw`-- Persist fine-grained oracle evidence without rewriting stable observations.
--
-- The collector still probes every feed every 15 minutes. This migration changes
-- only the raw-history write policy: explicitly configured core assets keep all
-- samples, while the default policy retains an hourly baseline and immediately
-- records meaningful price, deviation, freshness, confidence, or state changes.
-- A compact ledger proves each collection run, including stable rows skipped.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.price_snapshot_persistence_policies (
  policy_key text PRIMARY KEY,
  resolution text NOT NULL CHECK (resolution IN ('full', 'adaptive')),
  price_change_bps integer NOT NULL DEFAULT 25
    CHECK (price_change_bps BETWEEN 1 AND 100000),
  deviation_change_bps integer NOT NULL DEFAULT 10
    CHECK (deviation_change_bps BETWEEN 1 AND 100000),
  data_age_change_seconds integer NOT NULL DEFAULT 300
    CHECK (data_age_change_seconds BETWEEN 1 AND 2147483647),
  confidence_change numeric(6,4) NOT NULL DEFAULT 0.0500
    CHECK (confidence_change > 0 AND confidence_change <= 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    policy_key = '__default__'
    OR policy_key ~ '^[A-Z0-9][A-Z0-9._-]{0,31}$'
  )
);

CREATE TABLE IF NOT EXISTS public.price_snapshot_persistence_state (
  provider text NOT NULL,
  symbol text NOT NULL,
  chain_id integer NOT NULL,
  last_snapshot_ts timestamptz NOT NULL,
  last_price numeric(24,8) NOT NULL,
  last_deviation_pct numeric(10,4),
  last_data_age_seconds integer,
  last_confidence numeric(6,4),
  last_is_success boolean NOT NULL,
  last_error_message text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, symbol, chain_id)
);

CREATE TABLE IF NOT EXISTS public.price_snapshot_collection_runs (
  snapshot_ts timestamptz PRIMARY KEY,
  input_hash text NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  received_count integer NOT NULL CHECK (received_count >= 0),
  candidate_count integer NOT NULL CHECK (candidate_count >= 0),
  persisted_count integer NOT NULL CHECK (persisted_count >= 0),
  full_resolution_count integer NOT NULL CHECK (full_resolution_count >= 0),
  initial_count integer NOT NULL CHECK (initial_count >= 0),
  state_transition_count integer NOT NULL CHECK (state_transition_count >= 0),
  error_change_count integer NOT NULL CHECK (error_change_count >= 0),
  hourly_baseline_count integer NOT NULL CHECK (hourly_baseline_count >= 0),
  price_change_count integer NOT NULL CHECK (price_change_count >= 0),
  deviation_change_count integer NOT NULL CHECK (deviation_change_count >= 0),
  data_age_change_count integer NOT NULL CHECK (data_age_change_count >= 0),
  confidence_change_count integer NOT NULL CHECK (confidence_change_count >= 0),
  stable_skipped_count integer NOT NULL CHECK (stable_skipped_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.price_snapshot_persistence_policies IS
  'Raw price snapshot retention policy. __default__ applies to symbols without an explicit override.';
COMMENT ON TABLE public.price_snapshot_persistence_state IS
  'Last persisted adaptive observation per feed. Stable samples do not update this table.';
COMMENT ON TABLE public.price_snapshot_collection_runs IS
  'One idempotent, auditable ledger entry per fine-grained collection slot, including samples intentionally not persisted.';

INSERT INTO public.price_snapshot_persistence_policies (
  policy_key, resolution, price_change_bps, deviation_change_bps,
  data_age_change_seconds, confidence_change
) VALUES
  ('__default__', 'adaptive', 25, 10, 300, 0.0500),
  ('BTC', 'full', 25, 10, 300, 0.0500),
  ('ETH', 'full', 25, 10, 300, 0.0500),
  ('SOL', 'full', 25, 10, 300, 0.0500),
  ('BNB', 'full', 25, 10, 300, 0.0500),
  ('XRP', 'full', 25, 10, 300, 0.0500),
  ('ADA', 'full', 25, 10, 300, 0.0500),
  ('DOGE', 'full', 25, 10, 300, 0.0500),
  ('LINK', 'full', 25, 10, 300, 0.0500),
  ('USDC', 'full', 25, 10, 300, 0.0500),
  ('USDT', 'full', 25, 10, 300, 0.0500),
  ('DAI', 'full', 25, 10, 300, 0.0500),
  ('WBTC', 'full', 25, 10, 300, 0.0500),
  ('CBBTC', 'full', 25, 10, 300, 0.0500),
  ('TBTC', 'full', 25, 10, 300, 0.0500),
  ('STETH', 'full', 25, 10, 300, 0.0500),
  ('WSTETH', 'full', 25, 10, 300, 0.0500),
  ('CBETH', 'full', 25, 10, 300, 0.0500)
ON CONFLICT (policy_key) DO NOTHING;

ALTER TABLE public.price_snapshot_persistence_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshot_persistence_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshot_collection_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.price_snapshot_persistence_policies,
  public.price_snapshot_persistence_state,
  public.price_snapshot_collection_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.price_snapshot_persistence_policies,
  public.price_snapshot_persistence_state,
  public.price_snapshot_collection_runs TO service_role;

CREATE OR REPLACE FUNCTION public.persist_adaptive_price_snapshots(
  p_rows jsonb,
  p_snapshot_ts timestamptz,
  p_input_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_existing_hash text;
  v_existing_summary jsonb;
  v_received_count integer := 0;
  v_candidate_count integer := 0;
  v_persisted_count integer := 0;
  v_full_resolution_count integer := 0;
  v_initial_count integer := 0;
  v_state_transition_count integer := 0;
  v_error_change_count integer := 0;
  v_hourly_baseline_count integer := 0;
  v_price_change_count integer := 0;
  v_deviation_change_count integer := 0;
  v_data_age_change_count integer := 0;
  v_confidence_change_count integer := 0;
  v_stable_skipped_count integer := 0;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Expected an adaptive snapshot batch array';
  END IF;
  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'Expected an adaptive snapshot batch of at most 500 rows';
  END IF;
  IF p_snapshot_ts IS NULL THEN
    RAISE EXCEPTION 'Expected a snapshot timestamp';
  END IF;
  IF p_input_hash IS NULL OR p_input_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Expected a lowercase SHA-256 input hash';
  END IF;

  SELECT run.input_hash,
    jsonb_build_object(
      'received', run.received_count,
      'candidates', run.candidate_count,
      'persisted', run.persisted_count,
      'fullResolution', run.full_resolution_count,
      'initial', run.initial_count,
      'stateTransition', run.state_transition_count,
      'errorChange', run.error_change_count,
      'hourlyBaseline', run.hourly_baseline_count,
      'priceChange', run.price_change_count,
      'deviationChange', run.deviation_change_count,
      'dataAgeChange', run.data_age_change_count,
      'confidenceChange', run.confidence_change_count,
      'stableSkipped', run.stable_skipped_count
    )
  INTO v_existing_hash, v_existing_summary
  FROM public.price_snapshot_collection_runs AS run
  WHERE run.snapshot_ts = p_snapshot_ts;

  IF v_existing_hash IS NOT NULL THEN
    IF v_existing_hash <> p_input_hash THEN
      RAISE EXCEPTION 'Snapshot slot % was already persisted with a different input hash', p_snapshot_ts;
    END IF;
    RETURN v_existing_summary;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.price_snapshot_persistence_policies
    WHERE policy_key = '__default__'
  ) THEN
    RAISE EXCEPTION 'Adaptive snapshot persistence default policy is missing';
  END IF;

  v_received_count := jsonb_array_length(p_rows);

  WITH parsed AS (
    SELECT row.*, input.ordinality
    FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS input(payload, ordinality)
    CROSS JOIN LATERAL jsonb_to_record(input.payload) AS row(
      provider text,
      symbol text,
      chain_id integer,
      price numeric,
      consensus_price numeric,
      deviation_pct numeric,
      latency_ms integer,
      data_age_seconds integer,
      confidence numeric,
      is_success boolean,
      error_message text
    )
  ), normalized AS (
    SELECT DISTINCT ON (provider, symbol, chain_id)
      provider, symbol, chain_id, price, consensus_price, deviation_pct,
      latency_ms, data_age_seconds, confidence, is_success, error_message
    FROM parsed
    WHERE provider IS NOT NULL AND btrim(provider) <> ''
      AND symbol IS NOT NULL AND symbol ~ '^[A-Z0-9][A-Z0-9._-]{0,31}$'
      AND chain_id IS NOT NULL AND chain_id >= 0
      AND price IS NOT NULL
      AND is_success IS NOT NULL
      AND (data_age_seconds IS NULL OR data_age_seconds >= 0)
      AND (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
    ORDER BY provider, symbol, chain_id, is_success DESC, ordinality DESC
  ), configured AS (
    SELECT normalized.*,
      coalesce(symbol_policy.resolution, default_policy.resolution) AS resolution,
      coalesce(symbol_policy.price_change_bps, default_policy.price_change_bps) AS price_change_bps,
      coalesce(symbol_policy.deviation_change_bps, default_policy.deviation_change_bps) AS deviation_change_bps,
      coalesce(symbol_policy.data_age_change_seconds, default_policy.data_age_change_seconds) AS data_age_change_seconds,
      coalesce(symbol_policy.confidence_change, default_policy.confidence_change) AS confidence_change,
      state.last_snapshot_ts,
      state.last_price,
      state.last_deviation_pct,
      state.last_data_age_seconds,
      state.last_confidence,
      state.last_is_success,
      state.last_error_message
    FROM normalized
    CROSS JOIN public.price_snapshot_persistence_policies AS default_policy
    LEFT JOIN public.price_snapshot_persistence_policies AS symbol_policy
      ON symbol_policy.policy_key = normalized.symbol
    LEFT JOIN public.price_snapshot_persistence_state AS state
      ON state.provider = normalized.provider
      AND state.symbol = normalized.symbol
      AND state.chain_id = normalized.chain_id
    WHERE default_policy.policy_key = '__default__'
  ), planned AS (
    SELECT configured.*,
      CASE
        WHEN resolution = 'full' THEN 'full_resolution'
        WHEN last_snapshot_ts IS NULL THEN 'initial'
        WHEN last_is_success IS DISTINCT FROM is_success THEN 'state_transition'
        WHEN NOT is_success AND last_error_message IS DISTINCT FROM error_message THEN 'error_change'
        WHEN date_trunc('hour', last_snapshot_ts) < date_trunc('hour', p_snapshot_ts) THEN 'hourly_baseline'
        WHEN abs(price - last_price) * 10000 >= greatest(abs(last_price), 0.00000001::numeric) * price_change_bps
          THEN 'price_change'
        WHEN deviation_pct IS DISTINCT FROM last_deviation_pct
          AND (deviation_pct IS NULL OR last_deviation_pct IS NULL
            OR abs(deviation_pct - last_deviation_pct) * 100 >= deviation_change_bps)
          THEN 'deviation_change'
        WHEN data_age_seconds IS DISTINCT FROM last_data_age_seconds
          AND (data_age_seconds IS NULL OR last_data_age_seconds IS NULL
            OR abs(data_age_seconds - last_data_age_seconds) >= data_age_change_seconds)
          THEN 'data_age_change'
        WHEN confidence IS DISTINCT FROM last_confidence
          AND (confidence IS NULL OR last_confidence IS NULL
            OR abs(confidence - last_confidence) >= confidence_change)
          THEN 'confidence_change'
        ELSE 'stable'
      END AS write_reason
    FROM configured
  ), inserted AS (
    INSERT INTO public.price_snapshots AS snapshot (
      snapshot_ts, snapshot_hour, provider, symbol, chain_id, price,
      consensus_price, deviation_pct, latency_ms, data_age_seconds,
      confidence, is_success, error_message
    )
    SELECT p_snapshot_ts, date_trunc('hour', p_snapshot_ts), provider, symbol,
      chain_id, price, consensus_price, deviation_pct, latency_ms,
      data_age_seconds, confidence, is_success, error_message
    FROM planned
    WHERE write_reason <> 'stable'
    ON CONFLICT (snapshot_ts, provider, symbol, chain_id) DO NOTHING
    RETURNING provider, symbol, chain_id
  ), state_written AS (
    INSERT INTO public.price_snapshot_persistence_state AS existing (
      provider, symbol, chain_id, last_snapshot_ts, last_price,
      last_deviation_pct, last_data_age_seconds, last_confidence,
      last_is_success, last_error_message, updated_at
    )
    SELECT planned.provider, planned.symbol, planned.chain_id, p_snapshot_ts,
      planned.price, planned.deviation_pct, planned.data_age_seconds,
      planned.confidence, planned.is_success, planned.error_message, now()
    FROM planned
    INNER JOIN inserted
      ON inserted.provider = planned.provider
      AND inserted.symbol = planned.symbol
      AND inserted.chain_id = planned.chain_id
    WHERE planned.resolution = 'adaptive'
    ON CONFLICT (provider, symbol, chain_id) DO UPDATE
      SET last_snapshot_ts = EXCLUDED.last_snapshot_ts,
          last_price = EXCLUDED.last_price,
          last_deviation_pct = EXCLUDED.last_deviation_pct,
          last_data_age_seconds = EXCLUDED.last_data_age_seconds,
          last_confidence = EXCLUDED.last_confidence,
          last_is_success = EXCLUDED.last_is_success,
          last_error_message = EXCLUDED.last_error_message,
          updated_at = EXCLUDED.updated_at
      WHERE existing.last_snapshot_ts < EXCLUDED.last_snapshot_ts
    RETURNING 1
  )
  SELECT
    count(*)::integer,
    count(inserted.provider)::integer,
    count(*) FILTER (WHERE write_reason = 'full_resolution')::integer,
    count(*) FILTER (WHERE write_reason = 'initial')::integer,
    count(*) FILTER (WHERE write_reason = 'state_transition')::integer,
    count(*) FILTER (WHERE write_reason = 'error_change')::integer,
    count(*) FILTER (WHERE write_reason = 'hourly_baseline')::integer,
    count(*) FILTER (WHERE write_reason = 'price_change')::integer,
    count(*) FILTER (WHERE write_reason = 'deviation_change')::integer,
    count(*) FILTER (WHERE write_reason = 'data_age_change')::integer,
    count(*) FILTER (WHERE write_reason = 'confidence_change')::integer,
    count(*) FILTER (WHERE write_reason = 'stable')::integer
  INTO v_candidate_count, v_persisted_count, v_full_resolution_count,
    v_initial_count, v_state_transition_count, v_error_change_count,
    v_hourly_baseline_count, v_price_change_count, v_deviation_change_count,
    v_data_age_change_count, v_confidence_change_count, v_stable_skipped_count
  FROM planned
  LEFT JOIN inserted
    ON inserted.provider = planned.provider
    AND inserted.symbol = planned.symbol
    AND inserted.chain_id = planned.chain_id;

  INSERT INTO public.price_snapshot_collection_runs (
    snapshot_ts, input_hash, received_count, candidate_count, persisted_count,
    full_resolution_count, initial_count, state_transition_count,
    error_change_count, hourly_baseline_count, price_change_count,
    deviation_change_count, data_age_change_count, confidence_change_count,
    stable_skipped_count
  ) VALUES (
    p_snapshot_ts, p_input_hash, v_received_count, v_candidate_count,
    v_persisted_count, v_full_resolution_count, v_initial_count,
    v_state_transition_count, v_error_change_count, v_hourly_baseline_count,
    v_price_change_count, v_deviation_change_count, v_data_age_change_count,
    v_confidence_change_count, v_stable_skipped_count
  ) ON CONFLICT (snapshot_ts) DO NOTHING;

  IF NOT FOUND THEN
    SELECT run.input_hash,
      jsonb_build_object(
        'received', run.received_count,
        'candidates', run.candidate_count,
        'persisted', run.persisted_count,
        'fullResolution', run.full_resolution_count,
        'initial', run.initial_count,
        'stateTransition', run.state_transition_count,
        'errorChange', run.error_change_count,
        'hourlyBaseline', run.hourly_baseline_count,
        'priceChange', run.price_change_count,
        'deviationChange', run.deviation_change_count,
        'dataAgeChange', run.data_age_change_count,
        'confidenceChange', run.confidence_change_count,
        'stableSkipped', run.stable_skipped_count
      )
    INTO v_existing_hash, v_existing_summary
    FROM public.price_snapshot_collection_runs AS run
    WHERE run.snapshot_ts = p_snapshot_ts;

    IF v_existing_hash <> p_input_hash THEN
      RAISE EXCEPTION 'Snapshot slot % was already persisted with a different input hash', p_snapshot_ts;
    END IF;
    RETURN v_existing_summary;
  END IF;

  RETURN jsonb_build_object(
    'received', v_received_count,
    'candidates', v_candidate_count,
    'persisted', v_persisted_count,
    'fullResolution', v_full_resolution_count,
    'initial', v_initial_count,
    'stateTransition', v_state_transition_count,
    'errorChange', v_error_change_count,
    'hourlyBaseline', v_hourly_baseline_count,
    'priceChange', v_price_change_count,
    'deviationChange', v_deviation_change_count,
    'dataAgeChange', v_data_age_change_count,
    'confidenceChange', v_confidence_change_count,
    'stableSkipped', v_stable_skipped_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.persist_adaptive_price_snapshots(jsonb, timestamptz, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_adaptive_price_snapshots(jsonb, timestamptz, text)
  TO service_role;

COMMIT;
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputPath = fileURLToPath(
  new URL('supabase/migrations/0106_adaptive_snapshot_persistence.sql', repositoryRoot)
);
const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const check = args.has('--check');

if (write === check || [...args].some((arg) => arg !== '--write' && arg !== '--check')) {
  throw new Error('Use exactly one supported option: --write or --check');
}

if (write) {
  await writeFile(outputPath, migrationSql, 'utf8');
} else {
  const current = await readFile(outputPath, 'utf8');
  if (current !== migrationSql) {
    throw new Error(
      '0106_adaptive_snapshot_persistence.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
