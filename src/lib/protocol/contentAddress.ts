import { keccak256, toBytes } from 'viem';

/** RFC 8785-compatible canonical JSON for ordinary JSON data. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`);
    return `{${entries.join(',')}}`;
  }
  throw new Error('Value is not JSON-canonicalizable');
}

export function keccakContentId(value: unknown): `0x${string}` {
  return keccak256(toBytes(canonicalJson(value)));
}

export function bodyWithoutId<T extends object>(
  value: T,
  idKey: Extract<keyof T, string>
): Record<string, unknown> {
  const copy = { ...(value as Record<string, unknown>) };
  delete copy[idKey];
  return copy;
}
