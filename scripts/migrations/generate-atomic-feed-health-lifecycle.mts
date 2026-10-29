import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The snapshot collector previously committed a health batch and the
// threshold-based deactivation scan as two HTTP/RPC transactions. Compose the
// existing, proven batch routine with deactivation in one transaction: the
// health semantics do not change, while every collection pass avoids a second
// commit, WAL flush, and PostgREST round trip.
const migrationSql = String.raw`-- Atomically apply a feed-health batch and its threshold-based deactivations.
--
-- Preserve the existing success cadence, immediate failure increments, and
-- failure threshold. This wrapper only removes the separate transaction that
-- previously followed every collector health batch.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.apply_feed_health_batch(
  p_results jsonb,
  p_failure_threshold integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_updated integer;
  v_deactivated integer;
  v_now timestamptz := now();
BEGIN
  IF p_results IS NULL OR jsonb_typeof(p_results) <> 'object' THEN
    RAISE EXCEPTION 'Expected a feed-health result object';
  END IF;
  IF p_failure_threshold IS NULL OR p_failure_threshold < 1 OR p_failure_threshold > 1000 THEN
    RAISE EXCEPTION 'Expected a feed-health failure threshold between 1 and 1000';
  END IF;

  -- Reuse the established mutation routine so successful heartbeats stay
  -- sampled hourly, while failures keep incrementing immediately.
  v_updated := public.batch_update_feed_health(p_results);

  UPDATE public.oracle_feeds
  SET is_active = false,
      updated_at = v_now,
      deactivated_reason = 'health_failed',
      deactivated_at = v_now
  WHERE is_active = true
    AND consecutive_failures >= p_failure_threshold;
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated', coalesce(v_updated, 0),
    'deactivated', coalesce(v_deactivated, 0)
  );
END;
$function$;

COMMENT ON FUNCTION public.apply_feed_health_batch(jsonb, integer) IS
  'Atomically applies feed health and deactivates feeds at the supplied failure threshold.';

REVOKE ALL ON FUNCTION public.apply_feed_health_batch(jsonb, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_feed_health_batch(jsonb, integer)
  TO service_role;

COMMIT;
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputPath = fileURLToPath(
  new URL('supabase/migrations/0109_atomic_feed_health_lifecycle.sql', repositoryRoot)
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
      '0109_atomic_feed_health_lifecycle.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
