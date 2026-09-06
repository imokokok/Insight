/**
 * Parse the optional schemaVersion query override.
 * Absent or blank means use the current schema; integer values are preserved.
 */
export function parseRequestedSchemaVersion(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  return Number.isInteger(n) ? n : undefined;
}
