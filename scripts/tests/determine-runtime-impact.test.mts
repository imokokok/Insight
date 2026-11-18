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

test('does not deploy the app for database migrations and release-classifier changes', () => {
  assert.equal(
    requiresRuntimeBuild([
      'supabase/migrations/0146_atomic_24h_product_usage_reservations.sql',
      'scripts/determine-runtime-impact.mts',
      'scripts/tests/determine-runtime-impact.test.mts',
      '.github/workflows/deploy-production.yml',
    ]),
    false
  );
  assert.equal(
    requiresRuntimeBuild([
      'supabase/migrations/0146_atomic_24h_product_usage_reservations.sql',
      'src/lib/api/services/oracleWatchWindowService.ts',
    ]),
    true
  );
});
