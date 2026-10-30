import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = new URL('../../', import.meta.url);
const migrationPath = fileURLToPath(
  new URL('supabase/migrations/0111_sustain_nano_io_recovery.sql', repositoryRoot)
);

test('nano I/O recovery migration separates recurring jobs without reducing collection cadence', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.match(migration, /'github-dispatch-coverage-slo', '9,24,39,54 \* \* \* \*'/);
  assert.match(migration, /'github-dispatch-monad-dex-market', '2,12,22,32,42,52 \* \* \* \*'/);
  assert.match(migration, /'price-records-cleanup', '19,49 \* \* \* \*'/);
  assert.doesNotMatch(migration, /22,52 \* \* \* \*/);
});

test('nano I/O recovery migration keeps archived evidence intact and uses init-plan RLS checks', async () => {
  const migration = await readFile(migrationPath, 'utf8');

  assert.doesNotMatch(migration, /TRUNCATE\s+TABLE\s+public\.snapshot_archives/i);
  assert.match(migration, /USING \(\(SELECT auth\.uid\(\)\) = user_id\)/);
  assert.match(migration, /WITH CHECK \(\(SELECT auth\.uid\(\)\) = id\)/);
});
