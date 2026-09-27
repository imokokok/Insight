-- Optional bounded metadata reuse for fresh cron processes. Price observations
-- and their freshness/signature checks never come from this table.
BEGIN;
SET LOCAL lock_timeout = '2s';
CREATE TABLE IF NOT EXISTS public.oracle_rpc_metadata_cache (
  provider text NOT NULL CHECK (provider IN ('chainlink','api3')),
  chain_id integer NOT NULL CHECK (chain_id > 0),
  address text NOT NULL CHECK (address ~ '^0x[0-9a-f]{40}$'),
  checked_at timestamptz NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (provider,chain_id,address),
  CHECK (jsonb_typeof(data) = 'object'),
  CHECK (coalesce(jsonb_typeof(data->'decimals') = 'number'
    AND (data->>'decimals')::numeric BETWEEN 0 AND 255
    AND (data->>'decimals')::numeric = trunc((data->>'decimals')::numeric),false)),
  CHECK (provider <> 'chainlink' OR
    coalesce(jsonb_typeof(data->'phase') = 'number'
      AND (data->>'phase')::numeric BETWEEN 0 AND 65535
      AND (data->>'phase')::numeric = trunc((data->>'phase')::numeric)
      AND jsonb_typeof(data->'description') = 'string' AND length(data->>'description') <= 4096
      AND jsonb_typeof(data->'version') = 'string' AND data->>'version' ~ '^(0|[1-9][0-9]{0,77})$',false))
);
ALTER TABLE public.oracle_rpc_metadata_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oracle_rpc_metadata_cache FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.oracle_rpc_metadata_cache TO service_role;

CREATE OR REPLACE FUNCTION public.save_oracle_rpc_metadata(p_rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE written integer;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Expected a metadata batch array';
  END IF;
  IF jsonb_array_length(p_rows) > 100 THEN
    RAISE EXCEPTION 'Expected a metadata batch of at most 100 rows';
  END IF;
  INSERT INTO public.oracle_rpc_metadata_cache AS existing(provider,chain_id,address,checked_at,data)
    SELECT provider,chain_id,lower(address),checked_at,data
    FROM jsonb_to_recordset(p_rows) AS row(provider text,chain_id integer,address text,checked_at timestamptz,data jsonb)
    WHERE checked_at <= now() AND checked_at > now()-interval '1 hour'
  ON CONFLICT(provider,chain_id,address) DO UPDATE
    SET checked_at=excluded.checked_at,data=excluded.data
    WHERE excluded.checked_at > existing.checked_at;
  GET DIAGNOSTICS written = ROW_COUNT;
  -- Old addresses cannot accumulate indefinitely. This small table is touched
  -- only on actual refresh batches; no additional scheduler is needed.
  DELETE FROM public.oracle_rpc_metadata_cache WHERE checked_at < now()-interval '7 days';
  RETURN written;
END;
$$;
REVOKE ALL ON FUNCTION public.save_oracle_rpc_metadata(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_oracle_rpc_metadata(jsonb) TO service_role;
COMMIT;
