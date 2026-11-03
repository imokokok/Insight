import assert from 'node:assert/strict';
import test from 'node:test';

import { requiresRuntimeBuild } from '../determine-runtime-impact.mts';

test('skips the runtime build only for declared non-runtime paths', () => {
  assert.equal(
    requiresRuntimeBuild([
      'docs/research/release-notes.md',
      '.github/workflows/daily-report.yml',
      '.github/cron-dist/daily-report.mjs',
      'README.md',
    ]),
    false
  );
});

test('fails closed for a runtime path or an empty comparison', () => {
  assert.equal(requiresRuntimeBuild(['src/app/page.tsx']), true);
  assert.equal(requiresRuntimeBuild(['package.json']), true);
  assert.equal(requiresRuntimeBuild([]), true);
});
