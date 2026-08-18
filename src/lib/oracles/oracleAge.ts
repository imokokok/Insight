import { OracleProvider } from '@/types/oracle/enums';
import type { PriceData } from '@/types/oracle/price';

/**
 * Providers whose `PriceData.timestamp` is the oracle's REAL on-chain update
 * time (block time / FTSO round / dAPI `updatedAt` / on-chain pool observation).
 * For these, `now - timestamp` is a trustworthy oracle age.
 *
 * Off-chain aggregators (REDSTONE / DIA / REFLECTOR) return a SOURCE publish
 * time in `timestamp`, NOT the oracle's update time. Trusting it would make
 * every fresh read look seconds old and mask genuinely stale feeds. They must
 * supply `PriceData.dataAge` (computed from a reliable signal) or be treated as
 * having no age evidence.
 *
 * Verified by reading each client:
 *  - chainlink  -> on-chain aggregator `updatedAt` (block time)
 *  - api3       -> on-chain dAPI `updatedAt` (also sets explicit `dataAge`)
 *  - supra      -> on-chain pull update time
 *  - twap       -> on-chain Uniswap pool observation time
 *  - flare      -> on-chain FTSOv2 feed timestamp
 *  - switchboard -> on-chain (Solana) feed timestamp
 *  - winklink    -> on-chain (Tron) feed timestamp
 */
export const ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS = new Set<OracleProvider>([
  OracleProvider.CHAINLINK,
  OracleProvider.API3,
  OracleProvider.SUPRA,
  OracleProvider.TWAP,
  OracleProvider.FLARE,
  OracleProvider.SWITCHBOARD,
  OracleProvider.WINKLINK,
]);

/**
 * Resolve the oracle's TRUE age in seconds from a PriceData, or `null` when
 * there is no trustworthy signal.
 *
 * Mirrors the project principle "absence of evidence is not staleness":
 * off-chain providers that don't compute `dataAge` get `null` rather than a
 * fabricated small age from their publish timestamp — so they are never
 * falsely flagged stale (or falsely fresh).
 *
 * Precedence:
 *  1. Explicit per-oracle `dataAge` (API3 computes this from the on-chain dAPI
 *     `updatedAt`; other clients may set it too). Always trusted when present.
 *  2. On-chain providers: `now - timestamp` (their timestamp IS the oracle
 *     update time).
 *  3. Everything else (off-chain without a reliable signal): `null`.
 */
export function resolveOracleAgeSeconds(
  priceData: PriceData,
  now: number = Date.now()
): number | null {
  if (typeof priceData.dataAge === 'number' && priceData.dataAge >= 0) {
    return priceData.dataAge;
  }

  if (priceData.provider != null && ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.has(priceData.provider)) {
    const refTime = priceData.timestamp;
    if (typeof refTime === 'number' && refTime > 0) {
      return Math.max(0, Math.floor((now - refTime) / 1000));
    }
  }

  return null;
}
