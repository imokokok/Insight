function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

/** Deterministic key-sorted JSON shared with Insight's canonical hashing. */
export function canonicalJson(value: unknown, depth = 0): string {
  if (depth > 64) throw new TypeError('JSON value is too deeply nested');
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length > 20_000) throw new TypeError('JSON value is too large');
    return `[${value.map((entry) => canonicalJson(entry, depth + 1)).join(',')}]`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    if (
      keys.length > 20_000 ||
      keys.some((key) => ['__proto__', 'prototype', 'constructor'].includes(key))
    ) {
      throw new TypeError('JSON object contains unsafe or excessive keys');
    }
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], depth + 1)}`).join(',')}}`;
  }
  throw new TypeError('Value is not canonical JSON');
}
