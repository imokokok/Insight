import type { PriceData } from '@/types/oracle/price';

/**
 * Resolve the oracle's reported age in seconds from a PriceData, or `null` when
 * there is no usable timestamp at all.
 *
 * **Runtime age is intentionally permissive** (backward compatible with the
 * pre-fix behaviour): we prefer an explicit per-oracle `dataAge` (API3 computes
 * this from the on-chain dAPI `updatedAt`), otherwise we fall back to
 * `now - timestamp` for any provider that supplies a positive timestamp. This
 * keeps the snapshot / consensus / pre-trade hot path byte-identical to the
 * pre-fix behaviour, so changing this helper cannot regress the snapshot
 * collect cron or any downstream consumer.
 */
export function resolveOracleAgeSeconds(
  priceData: PriceData,
  now: number = Date.now()
): number | null {
  let age: number | null = null;

  if (typeof priceData.dataAge === 'number' && priceData.dataAge >= 0) {
    age = priceData.dataAge;
  } else {
    const refTime = priceData.timestamp;
    if (typeof refTime === 'number' && refTime > 0) {
      age = Math.floor((now - refTime) / 1000);
    }
  }

  if (age === null || !Number.isFinite(age)) {
    return null;
  }

  // Preserve the pre-fix contract: a negative age (clock skew) clamps to 0, and
  // the result is always a whole second.
  const clamped = Math.max(0, Math.floor(age));

  // `data_age_seconds` is a Postgres INTEGER (max 2_147_483_647). A client that
  // reports `dataAge` in the wrong unit (e.g. ms instead of seconds) or a
  // pathologically stale feed can otherwise exceed that and the hourly-snapshot
  // upsert throws, aborting the whole 15-min cron run. Clamp so a single bad
  // feed can never fail the run; the staleness gate still treats the (large)
  // value as stale. This is a safety net — the real fix is each client reporting
  // `dataAge` in seconds (see api3NetworkService.ts).
  if (clamped > 2_147_483_647) {
    return 2_147_483_647;
  }

  return clamped;
}
