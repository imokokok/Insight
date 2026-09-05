import { ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS } from '@/lib/oracles/oracleAge';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider } from '@/types/oracle/enums';

import type { SupabaseClient } from '@supabase/supabase-js';

const logger = createLogger('feed-cadence');

/**
 * Multiplier on a feed's observed cadence (p90 data age) beyond which we treat
 * the feed as stale. K = 8 means a feed must be ~8x slower than its normal
 * rhythm before we flag it — slow-but-healthy sources (e.g. API3's ~24h cadence)
 * are never falsely flagged. This is the "放长一点" (lengthen the window) knob:
 * raise it to be even more lenient.
 */
export const CAUTION_STALE_MULTIPLIER = 8;

/**
 * Absolute floor (seconds) below which a feed is NEVER considered stale by the
 * cadence check, regardless of its observed cadence. 1h guards against
 * pathologically low baselines (e.g. a feed whose p90 is a few seconds) from
 * flagging transient blips as stale.
 */
export const STALE_FLOOR_SECONDS = 3600;

/**
 * Hard backstop (seconds): feed data older than this is treated as genuinely
 * stuck and BLOCKs, independent of any observed cadence. 7 days is long enough
 * that no legitimately-slow production oracle hits it, but short enough to stop
 * a completely dead feed from being traded on.
 */
export const HARD_STALE_BLOCK_SECONDS = 604800;

/**
 * Master switch for the cadence-relative CAUTION path.
 *
 * Opt-in (default OFF) until every provider reports a trustworthy oracle age.
 * Several off-chain aggregators (REDSTONE / DIA / REFLECTOR) expose a SOURCE
 * publish time as their `timestamp`, not the oracle's real update time. Their
 * cadence baselines therefore collapse to a few seconds and the path produces
 * misleading always-fresh verdicts. Age resolution (`resolveOracleAgeSeconds`)
 * already returns `null` for those providers so they contribute NO baseline, but
 * the switch keeps the CAUTION branch fully dormant until the remaining
 * provider age signals are verified end-to-end.
 *
 * Enable with `ENABLE_CADENCE_CAUTION=true` once baselines are trustworthy.
 * Read at call time (not module load) so it is configurable per environment and
 * unit-testable.
 */
export function isCadenceCautionEnabled(): boolean {
  return process.env.ENABLE_CADENCE_CAUTION === 'true';
}

export interface FeedStalenessBaseline {
  provider: string;
  symbol: string;
  chainId: number;
  /** p90 of observed data_age_seconds; null when there is not enough history. */
  p90Seconds: number | null;
  sampleCount: number;
  computedAt: string;
}

/**
 * Linear-interpolated percentile. Pure + trivially testable.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * p;
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

/**
 * Compute the p90 of `data_age_seconds` for a single feed over the lookback
 * window from price_snapshots. Returns a null p90 when there are too few samples
 * — the caller must then NOT flag staleness (absence of evidence is not
 * staleness).
 *
 * IMPORTANT: price_snapshots.data_age_seconds must be the ORACLE's reported
 * age (now - oracle timestamp), not the ingestion/cache timestamp. See the
 * clock fix in snapshotCollector.buildSnapshotInputs and consensusPriceService.
 *
 * **Off-chain providers are excluded by design.** REDSTONE / DIA / REFLECTOR
 * expose a SOURCE publish time as their `timestamp`, not the oracle's real
 * update time. If we averaged their `data_age_seconds` into a p90, the result
 * would collapse to 1-9 seconds and the cadence-relative staleness path would
 * either always-pass (with the permissive resolver) or always-fail (with a
 * strict one). Either way, the number is meaningless. Until each off-chain
 * client computes a trustworthy `dataAge` from a real oracle signal, we
 * return `null` for them and rely on the 7-day hard backstop instead.
 */
export async function computeFeedStalenessBaseline(
  supabase: SupabaseClient,
  provider: string,
  symbol: string,
  chainId: number,
  lookbackHours = 48,
  minSamples = 12
): Promise<FeedStalenessBaseline> {
  if (!ON_CHAIN_TRUSTED_TIMESTAMP_PROVIDERS.has(provider as OracleProvider)) {
    // Off-chain provider without a verified oracle-age signal — absence of
    // evidence, not staleness. Hard backstop (7d) still applies.
    return {
      provider,
      symbol,
      chainId,
      p90Seconds: null,
      sampleCount: 0,
      computedAt: new Date().toISOString(),
    };
  }

  const since = new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from('price_snapshots')
    .select('data_age_seconds')
    .eq('provider', provider)
    .eq('symbol', symbol)
    .eq('chain_id', chainId)
    .gte('snapshot_ts', since)
    .not('data_age_seconds', 'is', null)
    .order('snapshot_ts', { ascending: false });

  if (error) {
    logger.warn('computeFeedStalenessBaseline query failed', {
      provider,
      symbol,
      chainId,
      error: error.message,
    });
    return {
      provider,
      symbol,
      chainId,
      p90Seconds: null,
      sampleCount: 0,
      computedAt: new Date().toISOString(),
    };
  }

  const ages = (data ?? [])
    .map((r) => (r as { data_age_seconds: number | null }).data_age_seconds)
    .filter((a): a is number => typeof a === 'number' && a >= 0);

  if (ages.length < minSamples) {
    return {
      provider,
      symbol,
      chainId,
      p90Seconds: null,
      sampleCount: ages.length,
      computedAt: new Date().toISOString(),
    };
  }

  return {
    provider,
    symbol,
    chainId,
    p90Seconds: Math.round(percentile(ages, 0.9)),
    sampleCount: ages.length,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Cadence-relative staleness test.
 *
 * A feed is stale only if its current oracle age is BOTH:
 *   (a) > K × observed p90 cadence, AND
 *   (b) > the absolute floor (STALE_FLOOR_SECONDS).
 *
 * When no baseline is available (null/zero), returns false — we never flag
 * staleness without observed-cadence evidence. This is what guarantees slow
 * sources are never falsely blocked.
 */
export function isCadenceStale(
  currentAgeSeconds: number,
  baselineP90Seconds: number | null,
  multiplier: number = CAUTION_STALE_MULTIPLIER,
  floorSeconds: number = STALE_FLOOR_SECONDS
): boolean {
  if (!isCadenceCautionEnabled()) return false;
  if (baselineP90Seconds == null || baselineP90Seconds <= 0) return false;
  if (currentAgeSeconds <= floorSeconds) return false;
  return currentAgeSeconds > multiplier * baselineP90Seconds;
}

/**
 * Refresh baselines for every active feed with one set-based database call.
 * The SQL function scans the snapshot window once and updates all matching
 * oracle_feeds rows without PostgREST pagination or per-feed round trips.
 *
 * Returns the number of active feeds written by the database operation.
 */
export async function updateAllFeedStalenessBaselines(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('refresh_oracle_feed_cadence_baselines', {
    p_lookback_hours: 48,
    p_min_samples: 12,
  });

  if (error) {
    throw new Error(`Feed-cadence baseline RPC failed: ${error.message}`);
  }

  const rawRow = Array.isArray(data) ? data[0] : data;
  const row = rawRow as {
    updated_count?: number | string | null;
    scanned_count?: number | string | null;
  } | null;

  if (!row) {
    throw new Error('Feed-cadence baseline RPC returned no result');
  }

  const updated = Number(row?.updated_count ?? 0);
  const scanned = Number(row?.scanned_count ?? 0);

  if (!Number.isSafeInteger(updated) || updated < 0) {
    throw new Error('Feed-cadence baseline RPC returned an invalid updated count');
  }
  if (!Number.isSafeInteger(scanned) || scanned < 0 || updated > scanned) {
    throw new Error('Feed-cadence baseline RPC returned an invalid scanned count');
  }

  logger.info('updateAllFeedStalenessBaselines complete', { updated, scanned });
  return updated;
}

/**
 * Read precomputed baselines for a symbol into a provider -> p90 map for the
 * pre-trade hot path. Queries by symbol only (chain-agnostic) and takes the MAX
 * p90 per provider, because cadence is roughly chain-independent for the same
 * symbol/provider and the MAX is the most lenient (fewest false positives).
 *
 * Returns an empty map on any failure — NON-BLOCKING: absence of baseline
 * evidence means no cadence CAUTION, but the 7-day absolute block still applies
 * via HARD_STALE_BLOCK_SECONDS.
 */
export async function getFeedStalenessBaselineMap(
  supabase: SupabaseClient,
  symbol: string
): Promise<Map<string, number | null>> {
  const { data, error } = await supabase
    .from('oracle_feeds')
    .select('provider, observed_data_age_p90_s')
    .eq('symbol', symbol)
    .eq('is_active', true);

  if (error || !data) {
    logger.warn('getFeedStalenessBaselineMap failed; staleness will use absolute backstop only', {
      symbol,
      error: error?.message,
    });
    return new Map();
  }

  const map = new Map<string, number | null>();
  for (const r of data) {
    const row = r as { provider: string; observed_data_age_p90_s: number | null };
    const existing = map.get(row.provider);
    const value = row.observed_data_age_p90_s ?? null;
    // Keep the most lenient (largest) baseline per provider.
    if (existing == null || (value != null && value > existing)) {
      map.set(row.provider, value);
    }
  }
  return map;
}
