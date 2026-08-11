export function escapeCSVField(field: string): string {
  // Defensive guard: the regex below assumes a string. Coercing non-string
  // input to '' keeps CSV generation safe instead of throwing a TypeError when
  // a number or null slips through from a caller.
  if (typeof field !== 'string') {
    return '';
  }
  if (/^[=+\-@\t\r]/.test(field)) {
    field = `'${field}`;
  }
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
