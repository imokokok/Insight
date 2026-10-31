/**
 * Decimal values persisted by the historical price stream have the same
 * eight-decimal contract as PostgreSQL `numeric(24,8)`.  SQLite's REAL type
 * is intentionally not the source of truth: large prices would otherwise
 * make adaptive-write decisions depend on binary floating-point rounding.
 */
export const PRICE_SCALE = 8;
export const DEVIATION_SCALE = 4;
export const CONFIDENCE_SCALE = 4;

function assertFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) throw new Error(`${field} must be finite`);
}

/** Convert a finite JavaScript number to a deterministic fixed-scale integer. */
export function decimalToScaled(value: number, scale: number, field: string): bigint {
  assertFinite(value, field);
  if (!Number.isInteger(scale) || scale < 0 || scale > 12) {
    throw new Error(`Invalid ${field} decimal scale`);
  }
  // Prices are capped below 1e21, so toFixed never falls back to exponential
  // notation.  Keep the sign separate because BigInt("-0001") is valid but
  // obscures the canonical representation used in hashes and evidence rows.
  const fixed = value.toFixed(scale);
  const negative = fixed.startsWith('-');
  const unsigned = negative ? fixed.slice(1) : fixed;
  const [whole, fraction = ''] = unsigned.split('.');
  const digits = `${whole}${fraction.padEnd(scale, '0')}`.replace(/^0+(?=\d)/, '');
  const scaled = BigInt(digits || '0');
  return negative ? -scaled : scaled;
}

export function scaledToCanonicalString(value: bigint): string {
  return value.toString();
}

export function scaledToNumber(value: string | bigint, scale: number): number {
  const scaled = typeof value === 'bigint' ? value : BigInt(value);
  const result = Number(scaled) / 10 ** scale;
  if (!Number.isFinite(result)) throw new Error('Stored decimal is outside the JavaScript range');
  return result;
}

export function absoluteDifference(left: bigint, right: bigint): bigint {
  const difference = left - right;
  return difference < 0n ? -difference : difference;
}

export function maximum(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}
