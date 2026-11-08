#!/usr/bin/env node
/**
 * Migration ledger drift check.
 *
 * The directory and the database are two different histories. This command
 * reads both and prints what each has that the other does not:
 *
 *   ledger AHEAD  → versions applied in the target database with no repository
 *                   file (a checkout can silently reuse or renumber them);
 *   ledger BEHIND → repository migrations the database has not recorded
 *                   (code can ship against a schema that is not there yet);
 *   name mismatch → the same version was applied with different content.
 *
 * It also rejects duplicate numbers and *new* holes inside the committed range.
 * 0076 is the only recorded historical gap; a new gap fails until it is filled
 * or documented in docs/operations/migration-ledger.md.
 *
 * Read-only. It never applies, repairs or renumbers anything.
 *
 * Usage:
 *   node --import tsx scripts/check-migration-drift.mts --linked
 *   node --import tsx scripts/check-migration-drift.mts --db-url "$SUPABASE_DB_URL"
 *   node --import tsx scripts/check-migration-drift.mts --ledger ledger.json
 *   node --import tsx scripts/check-migration-drift.mts --repository-only
 *
 * Exit codes: 0 in sync, 1 drift/duplicate/new gap, 2 usage or query failure.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  compareMigrationLedger,
  driftIsBlocking,
  formatMigrationDrift,
  type MigrationLedgerRow,
} from './lib/migration-drift';
import {
  findDuplicateMigrationNumbers,
  findMigrationNumberGaps,
  formatDuplicateMigrationNumbers,
  formatMigrationNumberGaps,
} from './lib/migration-numbers';

const KNOWN_GAPS = new Set(['0076']);
const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(HERE, '..', 'supabase', 'migrations');
const LEDGER_QUERY =
  'select version, name from supabase_migrations.schema_migrations order by version';

const argv = process.argv.slice(2);

function flag(name: string): boolean {
  return argv.includes(name);
}

function option(name: string): string | null {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) usage(`${name} requires a value`);
  return value;
}

function usage(message?: string): never {
  if (message) console.error(`check-migration-drift: ${message}`);
  console.error(
    [
      'usage: node --import tsx scripts/check-migration-drift.mts',
      '  --linked                 query the linked Supabase project (read-only)',
      '  --db-url <url>           query an explicit Postgres connection string (read-only)',
      '  --ledger <file>          compare against a saved JSON ledger instead of a database',
      '  --repository-only        check duplicates and gaps without a ledger',
      '  --json                   print machine-readable JSON',
      '  --help                   show this help',
    ].join('\n')
  );
  process.exit(2);
}

if (flag('--help')) usage();

const repositoryFiles = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.sql'))
  .map((entry) => entry.name)
  .sort();

const duplicates = findDuplicateMigrationNumbers(repositoryFiles);
const gaps = findMigrationNumberGaps(repositoryFiles);
const newGaps = gaps.filter((gap) => !gap.missing.every((version) => KNOWN_GAPS.has(version)));

function ledgerRowsFromFile(path: string): MigrationLedgerRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (error) {
    usage(`cannot read --ledger ${path}: ${(error as Error).message}`);
  }
  if (Array.isArray(parsed)) return parsed as MigrationLedgerRow[];
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { rows?: unknown }).rows)) {
    return (parsed as { rows: MigrationLedgerRow[] }).rows;
  }
  usage(`--ledger ${path} must be a JSON array of rows, or an object with a "rows" array`);
}

function rowsFromSupabase(stdout: string): MigrationLedgerRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`supabase returned non-JSON output: ${(error as Error).message}`);
  }
  if (Array.isArray(parsed)) return parsed as MigrationLedgerRow[];
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    for (const key of ['rows', 'result', 'data']) {
      if (Array.isArray(record[key])) return record[key] as MigrationLedgerRow[];
    }
  }
  throw new Error(`supabase JSON output has no row array: ${stdout.slice(0, 300)}`);
}

let ledgerRows: MigrationLedgerRow[] | null = null;
const ledgerFile = option('--ledger');
const dbUrl = option('--db-url');
const repositoryOnly = flag('--repository-only');

if (ledgerFile) {
  ledgerRows = ledgerRowsFromFile(ledgerFile);
} else if (!repositoryOnly) {
  if (!dbUrl && !flag('--linked')) {
    usage('choose --linked, --db-url <url>, --ledger <file>, or --repository-only');
  }
  try {
    const output = execFileSync(
      'supabase',
      [
        'db',
        'query',
        ...(dbUrl ? ['--db-url', dbUrl] : ['--linked']),
        '--output',
        'json',
        LEDGER_QUERY,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    ledgerRows = rowsFromSupabase(output);
  } catch (error) {
    console.error(
      `check-migration-drift: could not read the migration ledger: ${(error as Error).message}\n` +
        '  Read-only remediation: confirm `supabase` is linked, or pass --ledger with a saved JSON result.'
    );
    process.exit(2);
  }
}

const drift = ledgerRows ? compareMigrationLedger(repositoryFiles, ledgerRows) : null;
const blocking =
  duplicates.length > 0 || newGaps.length > 0 || (drift ? driftIsBlocking(drift) : false);

const report = {
  repository: {
    versions: drift?.repositoryVersions ?? repositoryFiles.map((file) => file.slice(0, 4)),
    duplicates,
    gaps: gaps.map((gap) => gap.missing),
    newGaps: newGaps.map((gap) => gap.missing),
    knownGaps: [...KNOWN_GAPS],
  },
  ledger: drift
    ? {
        versions: drift.ledgerVersions,
        aheadInLedger: drift.aheadInLedger,
        behindInLedger: drift.behindInLedger,
        nameMismatches: drift.nameMismatches,
        inSync: !driftIsBlocking(drift),
      }
    : null,
  blocking,
};

if (flag('--json')) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(blocking ? 1 : 0);
}

if (duplicates.length > 0) {
  console.error(formatDuplicateMigrationNumbers(duplicates));
}
if (newGaps.length > 0) {
  console.error(formatMigrationNumberGaps(newGaps));
  console.error(
    '  Fill the hole with the real migration, or record it in scripts/check-migration-drift.mts ' +
      'and docs/operations/migration-ledger.md together.'
  );
}
if (gaps.length > 0 && newGaps.length === 0) {
  console.log(
    `Repository: known historical gap ${[...KNOWN_GAPS].join(', ')} (documented, not blocking).`
  );
}

if (drift) {
  console.log(formatMigrationDrift(drift));
} else {
  console.log(
    `Repository: ${report.repository.versions.length} versions, ${duplicates.length} duplicate(s), ` +
      `${newGaps.length} new gap(s).`
  );
}

if (blocking) {
  console.error('\ncheck-migration-drift: BLOCKED');
  process.exit(1);
}
console.log('\ncheck-migration-drift: OK');
