import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The high-frequency collector used to commit hourly and fine-grained evidence
// independently. The two routines are already idempotent; compose them in one
// transaction so a retry cannot leave a collection slot half committed.
const migrationSql = String.raw`-- Commit the two high-volume snapshot evidence layers as one idempotent slot.
--
-- The hourly view remains the operational/reporting source and the adaptive
-- raw stream remains the ML/anomaly source. This wrapper changes neither
-- policy: it only guarantees all-or-nothing persistence and removes one
-- transaction/WAL flush from every high-frequency collection pass.

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.commit_snapshot_data_slot(
  p_hourly_rows jsonb,
  p_adaptive_rows jsonb,
  p_snapshot_ts timestamptz,
  p_input_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_hourly_written integer;
  v_persistence jsonb;
BEGIN
  -- Validation and retry/idempotency guards stay in the existing specialised
  -- routines. A failure in either routine aborts this whole RPC transaction.
  v_hourly_written := public.upsert_hourly_price_snapshots(p_hourly_rows);
  v_persistence := public.persist_adaptive_price_snapshots(
    p_adaptive_rows,
    p_snapshot_ts,
    p_input_hash
  );

  RETURN jsonb_build_object(
    'hourlyWritten', v_hourly_written,
    'persistence', v_persistence
  );
END;
$function$;

COMMENT ON FUNCTION public.commit_snapshot_data_slot(jsonb, jsonb, timestamptz, text) IS
  'Atomically writes hourly and adaptive raw snapshot evidence for one idempotent collection slot.';

REVOKE ALL ON FUNCTION public.commit_snapshot_data_slot(jsonb, jsonb, timestamptz, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_snapshot_data_slot(jsonb, jsonb, timestamptz, text)
  TO service_role;

COMMIT;
`;

const repositoryRoot = new URL('../../', import.meta.url);
const outputPath = fileURLToPath(
  new URL('supabase/migrations/0107_atomic_snapshot_slot.sql', repositoryRoot)
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
      '0107_atomic_snapshot_slot.sql is stale; regenerate it from this TypeScript source.'
    );
  }
}
