/**
 * Migration number guard.
 *
 * Two migrations sharing a numeric prefix cannot both be applied: Supabase
 * records `version` as the four-digit prefix, so the second one is either
 * rejected or silently skipped depending on the deploy path. This has collided
 * twice (0122 and 0129), so the check is automated instead of relying on
 * whoever picks the next number.
 *
 * The report must name every conflicting file and the repeated number; a
 * generic "duplicate migration" message is not actionable.
 */

export type DuplicateMigrationNumber = {
  /** The repeated four-digit prefix, e.g. "0129". */
  number: string;
  /** Every file carrying that prefix, in directory order. */
  files: string[];
};

const NUMBERED_MIGRATION = /^(\d{4})_/;

export function findDuplicateMigrationNumbers(files: string[]): DuplicateMigrationNumber[] {
  const byNumber = new Map<string, string[]>();
  for (const file of files) {
    const number = NUMBERED_MIGRATION.exec(file)?.[1];
    if (!number) continue;
    const existing = byNumber.get(number);
    if (existing) existing.push(file);
    else byNumber.set(number, [file]);
  }

  return [...byNumber.entries()]
    .filter(([, matches]) => matches.length > 1)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([number, matches]) => ({ number, files: matches }));
}

export function formatDuplicateMigrationNumbers(duplicates: DuplicateMigrationNumber[]): string {
  return duplicates
    .map(({ number, files }) => `Duplicate migration number ${number}: ${files.join(', ')}`)
    .join('\n');
}
