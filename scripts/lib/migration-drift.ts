/**
 * Compare the committed migration history with the ledger recorded by the
 * target database (`supabase_migrations.schema_migrations`).
 *
 * Repository files alone cannot tell whether production is ahead (migrations
 * applied from another checkout) or behind (commits not yet applied). Both are
 * release hazards: the first means a later checkout can silently renumber or
 * reuse an applied version, the second means code can ship against a schema the
 * database does not have.
 */

export type MigrationLedgerRow = {
  version: string;
  name?: string;
};

export type MigrationNameMismatch = {
  version: string;
  repository: string;
  ledger: string;
};

export type MigrationDrift = {
  repositoryVersions: string[];
  ledgerVersions: string[];
  /** Versions recorded by the database but absent from the repository. */
  aheadInLedger: string[];
  /** Versions present in the repository but never recorded by the database. */
  behindInLedger: string[];
  /** Same version, different migration name in the repository and the ledger. */
  nameMismatches: MigrationNameMismatch[];
};

const NUMBERED_MIGRATION = /^(\d{4})_/;

function normalizeVersion(value: string): string | null {
  const digits = String(value).trim();
  if (!/^\d+$/.test(digits)) return null;
  return digits.padStart(4, '0');
}

export function migrationNameFromFile(file: string): string {
  return file.replace(/\d{4,14}_/, '').replace(/\.sql$/i, '');
}

export function repositoryMigrationVersions(files: string[]): string[] {
  return [
    ...new Set(
      files
        .map((file) => NUMBERED_MIGRATION.exec(file)?.[1])
        .filter((version): version is string => Boolean(version))
    ),
  ].sort();
}

export function normalizeLedgerRows(
  rows: Array<MigrationLedgerRow | string | { version?: string | number; name?: string | null }>
): MigrationLedgerRow[] {
  const normalized: MigrationLedgerRow[] = [];
  for (const row of rows) {
    const rawVersion = typeof row === 'string' ? row : row?.version;
    if (rawVersion === undefined || rawVersion === null) continue;
    const version = normalizeVersion(String(rawVersion));
    if (!version) continue;
    const name = typeof row === 'string' ? undefined : (row.name ?? undefined);
    normalized.push(name === undefined ? { version } : { version, name: name ?? undefined });
  }
  return normalized.sort((left, right) => left.version.localeCompare(right.version));
}

export function compareMigrationLedger(
  repositoryFiles: string[],
  ledgerRows: Array<
    MigrationLedgerRow | string | { version?: string | number; name?: string | null }
  >
): MigrationDrift {
  const repositoryVersions = repositoryMigrationVersions(repositoryFiles);
  const normalizedLedger = normalizeLedgerRows(ledgerRows);
  const ledgerVersions = normalizedLedger.map((row) => row.version);

  const repositorySet = new Set(repositoryVersions);
  const ledgerSet = new Set(ledgerVersions);

  const aheadInLedger = ledgerVersions.filter((version) => !repositorySet.has(version));
  const behindInLedger = repositoryVersions.filter((version) => !ledgerSet.has(version));

  const ledgerByName = new Map(normalizedLedger.map((row) => [row.version, row.name ?? '']));
  const nameMismatches: MigrationNameMismatch[] = [];
  for (const file of repositoryFiles) {
    const version = NUMBERED_MIGRATION.exec(file)?.[1];
    if (!version || !ledgerSet.has(version)) continue;
    const ledgerName = ledgerByName.get(version);
    if (!ledgerName) continue;
    // Supabase stores either the bare migration name or the full file stem
    // (`0131_hyperevm_chainlink_feeds`); compare both without the numeric prefix.
    const repositoryName = migrationNameFromFile(file);
    if (repositoryName !== migrationNameFromFile(ledgerName)) {
      nameMismatches.push({ version, repository: repositoryName, ledger: ledgerName });
    }
  }

  return {
    repositoryVersions,
    ledgerVersions,
    aheadInLedger,
    behindInLedger,
    nameMismatches,
  };
}

export function driftIsBlocking(drift: MigrationDrift): boolean {
  return (
    drift.aheadInLedger.length > 0 ||
    drift.behindInLedger.length > 0 ||
    drift.nameMismatches.length > 0
  );
}

export function formatMigrationDrift(drift: MigrationDrift): string {
  const lines = [
    `Repository migrations: ${drift.repositoryVersions.length} version(s)`,
    `Ledger migrations:     ${drift.ledgerVersions.length} version(s)`,
  ];

  if (drift.aheadInLedger.length > 0) {
    lines.push(`\nLedger is AHEAD of the repository by ${drift.aheadInLedger.length}:`);
    lines.push(`  ${drift.aheadInLedger.join(', ')}`);
    lines.push('  Applied versions without a committed migration; do not renumber or reuse them.');
  }
  if (drift.behindInLedger.length > 0) {
    lines.push(`\nLedger is BEHIND the repository by ${drift.behindInLedger.length}:`);
    lines.push(`  ${drift.behindInLedger.join(', ')}`);
    lines.push('  Committed migrations that the database has not recorded as applied.');
  }
  if (drift.nameMismatches.length > 0) {
    lines.push(`\nVersion/name mismatches: ${drift.nameMismatches.length}`);
    for (const mismatch of drift.nameMismatches) {
      lines.push(
        `  ${mismatch.version}: repository "${mismatch.repository}", ledger "${mismatch.ledger}"`
      );
    }
    lines.push('  Same version applied with different content is a silent overwrite risk.');
  }
  if (!driftIsBlocking(drift)) {
    lines.push('\nRepository and ledger are in sync.');
  }
  return lines.join('\n');
}
