export function escapeCSVField(field: string): string {
  if (/^[=+\-@\t\r]/.test(field)) {
    field = `'${field}`;
  }
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
