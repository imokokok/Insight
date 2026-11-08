import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareMigrationLedger,
  driftIsBlocking,
  formatMigrationDrift,
  normalizeLedgerRows,
} from '../lib/migration-drift';

const repository = [
  '0130_product_24h_concurrency_caps.sql',
  '0131_hyperevm_chainlink_feeds.sql',
  '0132_oracle_watch_window_terms.sql',
];

test('reports every version the database applied without a repository file', () => {
  const drift = compareMigrationLedger(repository, [
    { version: '0130', name: 'product_24h_concurrency_caps' },
    { version: '0131', name: 'hyperevm_chainlink_feeds' },
    { version: '0132', name: 'oracle_watch_window_terms' },
    { version: '0133', name: 'stagger_and_merge_snapshot_schedule' },
    { version: '0134', name: 'archive_catchup_bound' },
  ]);

  assert.deepEqual(drift.aheadInLedger, ['0133', '0134']);
  assert.deepEqual(drift.behindInLedger, []);
  assert.equal(driftIsBlocking(drift), true);
  assert.match(formatMigrationDrift(drift), /Ledger is AHEAD of the repository by 2:/);
  assert.match(formatMigrationDrift(drift), /0133, 0134/);
});

test('reports every committed migration the database has not applied', () => {
  const drift = compareMigrationLedger(repository, [
    { version: '0130', name: 'product_24h_concurrency_caps' },
  ]);

  assert.deepEqual(drift.aheadInLedger, []);
  assert.deepEqual(drift.behindInLedger, ['0131', '0132']);
  assert.equal(driftIsBlocking(drift), true);
  assert.match(formatMigrationDrift(drift), /Ledger is BEHIND the repository by 2:/);
});

test('accepts bare names and full file stems in the ledger', () => {
  const drift = compareMigrationLedger(repository, [
    { version: '0130', name: 'product_24h_concurrency_caps' },
    { version: '0131', name: '0131_hyperevm_chainlink_feeds' },
    { version: '132', name: 'oracle_watch_window_terms' },
  ]);

  assert.deepEqual(drift.nameMismatches, []);
  assert.deepEqual(drift.aheadInLedger, []);
  assert.deepEqual(drift.behindInLedger, []);
  assert.equal(driftIsBlocking(drift), false);
  assert.match(formatMigrationDrift(drift), /Repository and ledger are in sync\./);
});

test('flags a reused version whose name changed', () => {
  const drift = compareMigrationLedger(repository, [
    { version: '0130', name: 'product_24h_concurrency_caps' },
    { version: '0131', name: 'chainlink_feeds' },
    { version: '0132', name: 'oracle_watch_window_terms' },
  ]);

  assert.deepEqual(drift.nameMismatches, [
    {
      version: '0131',
      repository: 'hyperevm_chainlink_feeds',
      ledger: 'chainlink_feeds',
    },
  ]);
  assert.equal(driftIsBlocking(drift), true);
});

test('normalizes numbers, drops invalid rows, and sorts by version', () => {
  assert.deepEqual(
    normalizeLedgerRows(['0132', { version: 130 }, { name: 'missing-version' }, 'not-a-number']),
    [{ version: '0130' }, { version: '0132' }]
  );
});
