/**
 * Migration number guard.
 *
 * Two migrations sharing a numeric prefix cannot both be applied: Supabase
 * records `version` as the four-digit prefix, so the second one is either
 * rejected or silently skipped depending on the deploy path. This has collided
 * twice (0122 and 0129), so the check is automated instead of relying on
 * whoever picks the next number.
 *
 * A missing number is also a defect: it hides the fact that a migration was
 * written, merged or deployed under a different number, and it makes the
 * directory look denser than the applied history really is. Gaps are reported
 * with the numbers on both sides and every missing version, so an intentional
 * historical gap can be recorded explicitly instead of being re-discovered.
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

export type MigrationNumberGap = {
  /** The highest number before the gap, e.g. "0075". */
  after: string;
  /** The next existing number after the gap, e.g. "0077". */
  before: string;
  /** Every missing four-digit version between `after` and `before`. */
  missing: string[];
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

/**
 * Odd numbers have no workflow meaning here, so a gap of "one past the highest
 * known number" is not detectable from the directory alone. This guard only
 * reports holes *inside* the existing range.
 */
export function findMigrationNumberGaps(files: string[]): MigrationNumberGap[] {
  const present = [
    ...new Set(
      files
        .map((file) => NUMBERED_MIGRATION.exec(file)?.[1])
        .filter((number): number is string => Boolean(number))
    ),
  ]
    .map(Number)
    .sort((left, right) => left - right);

  const gaps: MigrationNumberGap[] = [];
  for (let index = 0; index < present.length - 1; index += 1) {
    const after = present[index];
    const before = present[index + 1];
    const missing: string[] = [];
    for (let value = after + 1; value < before; value += 1) {
      missing.push(String(value).padStart(4, '0'));
    }
    if (missing.length > 0) {
      gaps.push({
        after: String(after).padStart(4, '0'),
        before: String(before).padStart(4, '0'),
        missing,
      });
    }
  }
  return gaps;
}

export function formatMigrationNumberGaps(gaps: MigrationNumberGap[]): string {
  return gaps
    .map(
      ({ after, before, missing }) =>
        `Missing migration number${missing.length > 1 ? 's' : ''} ${missing.join(', ')} between ${after} and ${before}`
    )
    .join('\n');
}
