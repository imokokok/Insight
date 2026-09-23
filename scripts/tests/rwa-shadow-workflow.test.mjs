import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowUrl = new URL('../../.github/workflows/rwa-reference-shadow.yml', import.meta.url);

test('RWA shadow workflow is read-only, checkpoint-scoped and preserves evidence', async () => {
  const workflow = await readFile(workflowUrl, 'utf8');
  assert.match(workflow, /permissions:\n  actions: read\n  contents: read/);
  assert.doesNotMatch(workflow, /contents: write/);
  assert.match(workflow, /cron: '0 2 28 9 \*'/);
  assert.match(workflow, /cron: '0 2 5,12 10 \*'/);
  for (const date of ['2026-09-28', '2026-10-05', '2026-10-12']) {
    assert.match(workflow, new RegExp(date));
  }
  assert.match(workflow, /actions\/cache\/restore@[0-9a-f]{40} # v4/);
  assert.match(workflow, /actions\/cache\/save@[0-9a-f]{40} # v4/);
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40} # v4/);
  assert.match(workflow, /npm run rwa:pilot:sample/);
  assert.doesNotMatch(workflow, /INSIGHT_API_KEY|SUPABASE_SERVICE_ROLE_KEY|CRON_SECRET/);
});
