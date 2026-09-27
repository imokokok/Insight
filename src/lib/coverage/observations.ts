import type { ConsensusProviderPrice } from '@/lib/api/services/consensusPriceService';
import { extractBaseSymbol, isUsdDenominatedFeedSymbol } from '@/lib/oracles/utils/oracleDataUtils';

import type { CoverageObservation } from '../../../sdk/src/coverage';

/** One scope/time conversion for signed coverage and unsigned live diagnostics.
 * Provider timestamps are milliseconds; coverage protocol timestamps are seconds.
 * Retrieval time alone never establishes source freshness. */
export function toCoverageObservation(
  p: ConsensusProviderPrice,
  input: { asset: string; chainId: number },
  chain: string
): CoverageObservation {
  const retrievedAt =
    typeof p.retrievedAt === 'number' && Number.isFinite(p.retrievedAt)
      ? Math.floor(p.retrievedAt / 1000)
      : null;
  const validAge =
    typeof p.dataAgeSeconds === 'number' &&
    Number.isFinite(p.dataAgeSeconds) &&
    p.dataAgeSeconds >= 0;
  const invalidAge = p.dataAgeSeconds != null && !validAge;
  let observedAt = invalidAge
    ? null
    : p.timestampProvenance === 'provider_age' && validAge && retrievedAt !== null
      ? Math.floor(retrievedAt - p.dataAgeSeconds!)
      : p.timestampProvenance === 'provider_timestamp' && Number.isFinite(p.timestamp)
        ? Math.floor(p.timestamp / 1000)
        : null;
  // Preserve a future timestamp for rejection. Otherwise use the older of two
  // supplied source-age signals; contradictory metadata cannot make a source fresher.
  if (
    p.timestampProvenance === 'provider_timestamp' &&
    observedAt !== null &&
    retrievedAt !== null &&
    observedAt <= retrievedAt &&
    validAge
  ) {
    observedAt = Math.min(observedAt, Math.floor(retrievedAt - p.dataAgeSeconds!));
  }
  return {
    provider: p.provider,
    evidenceChainId: p.chain === chain ? input.chainId : 0,
    status:
      p.countsTowardOracleQuorum === true &&
      typeof p.symbol === 'string' &&
      extractBaseSymbol(p.symbol).toUpperCase() === input.asset &&
      isUsdDenominatedFeedSymbol(p.symbol)
        ? p.status
        : 'unsupported',
    price: Number.isFinite(p.price) ? p.price : null,
    observedAt,
    retrievedAt,
    timestampProvenance: p.timestampProvenance ?? 'unknown',
    excluded: p.isOutlier,
  };
}
