import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDurableState } from '../../examples/durable-state/store.mjs';

test('durable state survives reopening, serializes writes and refuses corruption or a second writer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-state-'));
  try {
    const first = await openDurableState(root);
    await assert.rejects(openDurableState(root), { code: 'EEXIST' });
    const state = { halted: true, incidentId: 'incident-1' };
    const saved = first.save('ETH@ethereum', state);
    state.halted = false;
    await saved;
    await first.close();
    const second = await openDurableState(root);
    assert.equal((await second.load('ETH@ethereum')).halted, true);
    assert.equal(await second.load('missing'), null);
    await Promise.all([
      second.save('checkpoint', { stage: 'SIGNED' }),
      second.save('checkpoint', { stage: 'ACCEPTED' }),
    ]);
    assert.equal((await second.load('checkpoint')).stage, 'ACCEPTED');
    const files = (await readdir(root)).filter((name) => name.endsWith('.json'));
    for (const name of files) assert.equal((await stat(join(root, name))).mode & 0o777, 0o600);
    const target = (
      await Promise.all(
        files.map(async (name) => ({
          name,
          record: JSON.parse(await readFile(join(root, name), 'utf8')),
        }))
      )
    ).find((item) => item.record.key === 'ETH@ethereum');
    await writeFile(join(root, target.name), '{truncated');
    await assert.rejects(second.load('ETH@ethereum'), SyntaxError);
    await second.close();
    await assert.rejects(second.save('late', {}), /closed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
