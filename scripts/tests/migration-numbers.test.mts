import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import test from 'node:test';

import {
  findDuplicateMigrationNumbers,
  findMigrationNumberGaps,
  formatDuplicateMigrationNumbers,
  formatMigrationNumberGaps,
} from '../lib/migration-numbers';

// The only hole in the committed history. 0076 was never committed; it is not a
// template for skipping numbers. Any new gap must fail this test and be either
// filled with the real migration or recorded here with a reason.
const KNOWN_GAPS = [
  {
    after: '0075',
    before: '0077',
    missing: ['0076'],
  },
];

test('the report names each conflicting file and the repeated number', () => {
  const duplicates = findDuplicateMigrationNumbers([
    '0122_acquisition_source_allowlist.sql',
    '0129_billing_schema_audit.sql',
    '0129_product_24h_concurrency_caps.sql',
    '0130_next.sql',
    'README.md',
  ]);

  assert.deepEqual(duplicates, [
    {
      number: '0129',
      files: ['0129_billing_schema_audit.sql', '0129_product_24h_concurrency_caps.sql'],
    },
  ]);
  assert.equal(
    formatDuplicateMigrationNumbers(duplicates),
    'Duplicate migration number 0129: 0129_billing_schema_audit.sql, 0129_product_24h_concurrency_caps.sql'
  );
});

test('unique numbers and unnumbered files pass', () => {
  assert.deepEqual(
    findDuplicateMigrationNumbers(['0128_waiver_comment.sql', '0129_audit.sql', 'notes.sql']),
    []
  );
  assert.equal(formatDuplicateMigrationNumbers([]), '');
});

test('a hole between two existing numbers names every missing version', () => {
  const gaps = findMigrationNumberGaps([
    '0130_product_24h_concurrency_caps.sql',
    '0132_oracle_watch_window_terms.sql',
    '0135_archive_guard_alignment.sql',
  ]);

  assert.deepEqual(gaps, [
    { after: '0130', before: '0132', missing: ['0131'] },
    { after: '0132', before: '0135', missing: ['0133', '0134'] },
  ]);
  assert.equal(
    formatMigrationNumberGaps(gaps),
    [
      'Missing migration number 0131 between 0130 and 0132',
      'Missing migration numbers 0133, 0134 between 0132 and 0135',
    ].join('\n')
  );
});

test('a contiguous sequence and unnumbered files have no gaps', () => {
  assert.deepEqual(
    findMigrationNumberGaps(['0130_a.sql', '0131_b.sql', '0132_c.sql', 'notes.sql']),
    []
  );
  assert.equal(formatMigrationNumberGaps([]), '');
});

test('supabase/migrations has no duplicate numeric prefix and only the recorded gap', async () => {
  const files = await readdir(new URL('../../supabase/migrations/', import.meta.url));
  const duplicates = findDuplicateMigrationNumbers(files);
  assert.equal(duplicates.length, 0, formatDuplicateMigrationNumbers(duplicates));

  const gaps = findMigrationNumberGaps(files);
  assert.deepEqual(
    gaps,
    KNOWN_GAPS,
    [
      formatMigrationNumberGaps(gaps),
      'A new gap must be filled with the real migration, or documented in KNOWN_GAPS',
      'in scripts/tests/migration-numbers.test.mts and docs/operations/migration-ledger.md.',
    ].join('\n')
  );
});
