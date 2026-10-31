BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.turso_price_slot_receipts (
  snapshot_ts timestamptz PRIMARY KEY,
  input_hash text NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  partition_key text NOT NULL CHECK (partition_key ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  raw_digest text NOT NULL CHECK (raw_digest ~ '^[a-f0-9]{64}$'),
  hourly_written integer NOT NULL CHECK (hourly_written >= 0),
  projected_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.turso_price_slot_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.turso_price_slot_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.turso_price_slot_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.project_turso_price_slot(
  p_hourly_rows jsonb,
  p_snapshot_ts timestamptz,
  p_input_hash text,
  p_partition_key text,
  p_raw_digest text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_existing public.turso_price_slot_receipts%ROWTYPE;
  v_hourly_written integer;
BEGIN
  IF p_hourly_rows IS NULL OR jsonb_typeof(p_hourly_rows) <> 'array'
    OR jsonb_array_length(p_hourly_rows) > 500
    OR p_snapshot_ts IS NULL
    OR p_input_hash IS NULL OR p_input_hash !~ '^[a-f0-9]{64}$'
    OR p_partition_key IS NULL OR p_partition_key !~ '^[a-z0-9][a-z0-9-]{0,62}$'
    OR p_raw_digest IS NULL OR p_raw_digest !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid Turso price-slot projection payload';
  END IF;

  SELECT * INTO v_existing
  FROM public.turso_price_slot_receipts
  WHERE snapshot_ts = p_snapshot_ts;

  IF FOUND THEN
    IF v_existing.input_hash <> p_input_hash
      OR v_existing.partition_key <> p_partition_key
      OR v_existing.raw_digest <> p_raw_digest THEN
      RAISE EXCEPTION 'Turso price slot % was already projected with different evidence', p_snapshot_ts;
    END IF;
    RETURN jsonb_build_object('hourlyWritten', v_existing.hourly_written, 'replayed', true);
  END IF;

  v_hourly_written := public.upsert_hourly_price_snapshots(p_hourly_rows);

  INSERT INTO public.turso_price_slot_receipts (
    snapshot_ts, input_hash, partition_key, raw_digest, hourly_written
  ) VALUES (
    p_snapshot_ts, p_input_hash, p_partition_key, p_raw_digest, v_hourly_written
  );

  RETURN jsonb_build_object('hourlyWritten', v_hourly_written, 'replayed', false);
END;
$function$;

COMMENT ON FUNCTION public.project_turso_price_slot(jsonb,timestamptz,text,text,text) IS
  'Idempotently projects one Turso-captured price slot into Supabase hourly business snapshots.';

REVOKE ALL ON FUNCTION public.project_turso_price_slot(jsonb,timestamptz,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_turso_price_slot(jsonb,timestamptz,text,text,text)
  TO service_role;

COMMIT;
