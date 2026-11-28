import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const repositoryRoot = new URL('../../', import.meta.url);

async function readWorkflow(name: string): Promise<string> {
  return readFile(new URL(`.github/workflows/${name}`, repositoryRoot), 'utf8');
}

test('existing backup artifacts verify compressed bytes and publish a SHA-256 manifest', async () => {
  const workflows = await Promise.all([
    readWorkflow('supabase-assets-backup.yml'),
    readWorkflow('supabase-archives-backup.yml'),
    readWorkflow('turso-ops-backup.yml'),
  ]);

  for (const workflow of workflows) {
    assert.match(workflow, /sha256sum --binary \"\$BACKUP_FILE\" > SHA256SUMS/);
    assert.match(workflow, /sha256sum --check --strict SHA256SUMS/);
    assert.match(workflow, /path:\s*\|\n\s+backup\/[^\n]+\n\s+backup\/SHA256SUMS/);
  }

  assert.match(workflows[0], /gzip -t \"backup\/\$\{BACKUP_FILE\}\"/);
  assert.match(workflows[0], /PostgreSQL database dump complete/);
  assert.match(workflows[1], /pg_restore --list/);
  assert.match(workflows[2], /gzip -t \"backup\/\$\{BACKUP_FILE\}\"/);
});
