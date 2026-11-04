import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import test from 'node:test';

test('mainline governance compares tree snapshots after a history rewrite', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'insight-mainline-governance-'));
  const binDirectory = join(tempRoot, 'bin');

  try {
    await mkdir(binDirectory);
    const gitShim = join(binDirectory, 'git');
    await writeFile(
      gitShim,
      `#!/bin/sh
case "$1" in
  cat-file)
    [ "$2" = "-e" ] && [ "$3" = "orphan-base^{commit}" ] && exit 0
    ;;
  merge-base)
    [ "$2" = "orphan-base" ] && [ "$3" = "HEAD" ] && exit 1
    ;;
  diff)
    [ "$2" = "--name-status" ] && [ "$3" = "orphan-base" ] && [ "$4" = "HEAD" ] && [ "$#" -eq 4 ] && exit 0
    ;;
esac
echo "Unexpected git invocation: $*" >&2
exit 97
`,
      'utf8'
    );
    await chmod(gitShim, 0o755);

    const workspace = resolve(import.meta.dirname, '../..');
    const scriptPath = join(workspace, 'scripts/check-mainline-governance.mjs');
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: workspace,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ''}`,
        PROTOCOL_GOVERNANCE_BASE: 'orphan-base',
      },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /mainline governance OK/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
