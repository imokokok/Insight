import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('receipt-gated Turso fallback preserves GitHub as primary and dispatches only missing slots', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/0120_receipt_gated_turso_fallback.sql', import.meta.url),
    'utf8'
  );

  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.dispatch_turso_snapshot_fallback_if_unprojected\(\)/
  );
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.dispatch_turso_projection_fallback_if_unprojected\(\)/
  );
  assert.match(migration, /FROM public\.turso_price_slot_receipts\s+WHERE snapshot_ts = v_slot/);
  assert.match(migration, /PERFORM public\.dispatch_github_workflow\('snapshot-collect\.yml'\)/);
  assert.match(migration, /PERFORM public\.dispatch_github_workflow\('turso-price-project\.yml'\)/);
  assert.match(migration, /'github-dispatch-turso-snapshot-fallback', '7,22,37,52 \* \* \* \*'/);
  assert.match(migration, /'github-dispatch-turso-projection-fallback', '10,25,40,55 \* \* \* \*'/);
  assert.match(
    migration,
    /'github-dispatch-turso-snapshot-fallback',\s+'github-dispatch-turso-projection-fallback'/
  );
  assert.doesNotMatch(migration, /cron\.schedule\(\s*'github-dispatch-snapshot-collect'/);
  assert.doesNotMatch(migration, /cron\.schedule\(\s*'github-dispatch-turso-price-project'/);
});
