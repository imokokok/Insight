import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import test from 'node:test';

import {
  findDuplicateMigrationNumbers,
  formatDuplicateMigrationNumbers,
} from '../lib/migration-numbers';

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

test('supabase/migrations has no duplicate numeric prefix', async () => {
  const files = await readdir(new URL('../../supabase/migrations/', import.meta.url));
  const duplicates = findDuplicateMigrationNumbers(files);
  assert.equal(duplicates.length, 0, formatDuplicateMigrationNumbers(duplicates));
});
