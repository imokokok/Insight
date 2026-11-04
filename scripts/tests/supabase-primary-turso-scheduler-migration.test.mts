import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Supabase is the authoritative Turso clock and keeps receipt probes recovery-only', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/0121_supabase_primary_turso_scheduler.sql', import.meta.url),
    'utf8'
  );
  const snapshotWorkflow = await readFile(
    new URL('../../.github/workflows/snapshot-collect.yml', import.meta.url),
    'utf8'
  );
  const projectionWorkflow = await readFile(
    new URL('../../.github/workflows/turso-price-project.yml', import.meta.url),
    'utf8'
  );

  assert.match(migration, /'github-dispatch-snapshot-collect', '0,15,30,45 \* \* \* \*'/);
  assert.match(migration, /'github-dispatch-turso-price-project', '3,18,33,48 \* \* \* \*'/);
  assert.match(migration, /'github-dispatch-turso-snapshot-fallback', '7,22,37,52 \* \* \* \*'/);
  assert.match(migration, /'github-dispatch-turso-projection-fallback', '10,25,40,55 \* \* \* \*'/);
  assert.match(migration, /SELECT public\.dispatch_turso_snapshot_fallback_if_unprojected\(\)/);
  assert.match(migration, /SELECT public\.dispatch_turso_projection_fallback_if_unprojected\(\)/);
  assert.match(
    migration,
    /'github-dispatch-snapshot-collect',\s+'github-dispatch-turso-price-project',\s+'github-dispatch-turso-snapshot-fallback'/
  );
  assert.match(snapshotWorkflow, /workflow_dispatch:[\s\S]*dispatch_id:[\s\S]*scheduled_for:/);
  assert.match(projectionWorkflow, /workflow_dispatch:[\s\S]*dispatch_id:[\s\S]*scheduled_for:/);
  assert.doesNotMatch(snapshotWorkflow, /\n\s*schedule:/);
  assert.doesNotMatch(projectionWorkflow, /\n\s*schedule:/);
});
