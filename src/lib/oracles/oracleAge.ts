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
 *
 * **The ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS set is NOT consulted here** — it
 * is the STRICT classification consumed by `computeFeedStalenessBaseline`
 * (feedCadence.ts) to decide which feeds are allowed to contribute to the
 * cadence p90 baseline. Off-chain aggregators (REDSTONE / DIA / REFLECTOR)
 * report a SOURCE publish time, not the oracle's real update time; letting
 * those values into the cadence baseline produces 1-9s p90s that poison the
 * cadence-relative staleness path. The baseline computation therefore returns
 * `null` for off-chain providers until each of them supplies a trustworthy
 * `dataAge` (a real on-chain-or-otherwise-verified oracle age).
 *
 * Until that per-client hardening lands, the cadence-relative CAUTION path
 * stays opt-in (`ENABLE_CADENCE_CAUTION`, default OFF) so the bad baselines are
 * dormant. The 7-day hard backstop (`HARD_STALE_BLOCK_SECONDS`) still blocks
 * genuinely dead feeds independently.
 */
export function resolveOracleAgeSeconds(
  priceData: PriceData,
  now: number = Date.now()
): number | null {
  if (typeof priceData.dataAge === 'number' && priceData.dataAge >= 0) {
    return priceData.dataAge;
  }

  const refTime = priceData.timestamp;
  if (typeof refTime !== 'number' || refTime <= 0) {
    return null;
  }

  return Math.max(0, Math.floor((now - refTime) / 1000));
}
