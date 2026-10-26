import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const migrationSql = String.raw`-- Keep a recovery signal immediately, but avoid rewriting a wide feed-registry
-- row for every successful realtime read. The collection cadence is 15 minutes
-- and feeds are considered stale on a much longer horizon, so 30-minute
-- success snapshots retain useful operational visibility while cutting normal
-- health writes in half.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

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
        OR feed.last_success_at < p_success_at - interval '30 minutes'
      )
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$function$;
REVOKE ALL ON FUNCTION public.touch_oracle_feed_success(text,text,integer,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_oracle_feed_success(text,text,integer,timestamptz)
  TO service_role;

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
        OR feed.last_success_at < now_ts - interval '30 minutes'
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
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputPath = fileURLToPath(
  new URL('supabase/migrations/0101_reduce_realtime_health_io.sql', repositoryRoot)
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
      '0101_reduce_realtime_health_io.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
