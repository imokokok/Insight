/**
 * Deterministic JSON for signed values. Rejects values JSON would silently
 * omit or coerce so callers cannot hash a different object than they emit.
 */
export function canonicalJsonString(value: unknown): string {
  const ancestors = new Set<object>();
  let visited = 0;
  const encoder = new TextEncoder();
  const maxBytes = 256 * 1024;

  const checkSize = (text: string): string => {
    if (encoder.encode(text).byteLength > maxBytes) {
      throw new TypeError('Canonical JSON exceeds the byte limit');
    }
    return text;
  };

  const isPlainRecord = (current: unknown): current is Record<string, unknown> => {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return false;
    try {
      const prototype = Object.getPrototypeOf(current);
      return prototype === Object.prototype || prototype === null;
    } catch {
      return false;
    }
  };

  const visit = (current: unknown, depth: number): string => {
    visited += 1;
    if (visited > 20_000 || depth > 64)
      throw new TypeError('JSON value exceeds canonicalization limits');
    if (current === null) return 'null';
    if (typeof current === 'string' || typeof current === 'boolean')
      return checkSize(JSON.stringify(current));
    if (typeof current === 'number') {
      if (!Number.isFinite(current))
        throw new TypeError('Non-finite numbers are not canonical JSON');
      return checkSize(JSON.stringify(current));
    }
    if (typeof current !== 'object') throw new TypeError('Value is not JSON serializable');
    if (ancestors.has(current)) throw new TypeError('Circular JSON value');

    ancestors.add(current);
    try {
      if (Array.isArray(current)) {
        if (current.length > 20_000 - visited) {
          throw new TypeError('JSON value exceeds canonicalization limits');
        }
        const ownKeys = Reflect.ownKeys(current);
        if (
          ownKeys.some(
            (key) =>
              typeof key === 'symbol' ||
              (key !== 'length' &&
                (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= current.length))
          )
        ) {
          throw new TypeError('Arrays with extra properties are not canonical JSON');
        }
        const values: string[] = [];
        for (let index = 0; index < current.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
          if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
            throw new TypeError('Sparse arrays and accessors are not canonical JSON');
          }
          values.push(visit(descriptor.value, depth + 1));
        }
        return checkSize(`[${values.join(',')}]`);
      }
      if (!isPlainRecord(current)) throw new TypeError('Only plain JSON objects are supported');
      if (Reflect.ownKeys(current).some((key) => typeof key === 'symbol')) {
        throw new TypeError('Symbol keys are not canonical JSON');
      }
      const keys = Object.keys(current).sort();
      if (Reflect.ownKeys(current).length !== keys.length) {
        throw new TypeError('Non-enumerable object properties are not canonical JSON');
      }
      for (const key of keys) {
        if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
          throw new TypeError('Unsafe JSON object key');
        }
      }
      const entries = keys.map((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
          throw new TypeError('Accessors are not canonical JSON');
        }
        return `${JSON.stringify(key)}:${visit(descriptor.value, depth + 1)}`;
      });
      return checkSize(`{${entries.join(',')}}`);
    } finally {
      ancestors.delete(current);
    }
  };

  return checkSize(visit(value, 0));
}
