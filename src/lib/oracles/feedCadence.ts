import { createLogger } from '@/lib/utils/logger';

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
 * IMPORTANT: price_snapshots.data_age_seconds must be the ORACLE's true age
 * (now - oracle timestamp), not the ingestion/cache timestamp. See the clock
 * fix in snapshotCollector.buildSnapshotInputs and consensusPriceService.
 */
export async function computeFeedStalenessBaseline(
  supabase: SupabaseClient,
  provider: string,
  symbol: string,
  chainId: number,
  lookbackHours = 48,
  minSamples = 12
): Promise<FeedStalenessBaseline> {
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
  if (baselineP90Seconds == null || baselineP90Seconds <= 0) return false;
  if (currentAgeSeconds <= floorSeconds) return false;
  return currentAgeSeconds > multiplier * baselineP90Seconds;
}

/**
 * Persist baselines for every active feed back into oracle_feeds. Intended to be
 * run on a schedule (e.g. a daily cron) so the pre-trade hot path is an O(1)
 * read. On any per-feed error it logs and continues — one bad feed must not
 * abort the whole batch.
 *
 * Returns the number of feeds whose baseline was successfully written.
 */
export async function updateAllFeedStalenessBaselines(supabase: SupabaseClient): Promise<number> {
  const { data: feeds, error } = await supabase
    .from('oracle_feeds')
    .select('provider, symbol, chain_id')
    .eq('is_active', true);

  if (error || !feeds || feeds.length === 0) {
    logger.warn('updateAllFeedStalenessBaselines: failed to list active feeds', {
      error: error?.message,
    });
    return 0;
  }

  // Dedupe (provider, symbol, chain_id) — oracle_feeds is keyed per feed.
  const seen = new Set<string>();
  let updated = 0;

  for (const f of feeds) {
    const key = `${f.provider}|${f.symbol}|${f.chain_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const baseline = await computeFeedStalenessBaseline(
        supabase,
        f.provider,
        f.symbol,
        f.chain_id
      );
      const { error: updErr } = await supabase
        .from('oracle_feeds')
        .update({
          observed_data_age_p90_s: baseline.p90Seconds,
          observed_cadence_updated_at: baseline.computedAt,
        })
        .eq('provider', f.provider)
        .eq('symbol', f.symbol)
        .eq('chain_id', f.chain_id);
      if (!updErr) updated++;
    } catch (e) {
      logger.warn('updateAllFeedStalenessBaselines: feed update failed', {
        key,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  logger.info('updateAllFeedStalenessBaselines complete', { updated, scanned: seen.size });
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
