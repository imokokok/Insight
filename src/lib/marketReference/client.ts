/**
 * Market-reference client — reads the external truth layer for consumers.
 *
 * Consumption rules (from the collaboration standards):
 *  - Read-only from the `market_reference_hourly` rollup view with a bounded
 *    query; NEVER fetch CEX APIs in a request hot path.
 *  - Fail-closed freshness: a rollup row older than `MAX_REF_AGE_HOURS` is
 *    treated as absent — stale market truth is worse than no truth.
 *  - The returned value is EVIDENCE: consumers (pre-trade ML feature, Watch
 *    advisory) must treat null as "no signal", never as zero divergence.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { TTLCache } from '@/lib/utils/cache';
import { roundTo } from '@/lib/utils/format';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MarketReferenceClient');

/** Rollup rows older than this are fail-closed absent (hours). */
export const MAX_REF_AGE_HOURS = 3;

interface HourlyRefRow {
  symbol: string;
  ref_hour: string;
  ref_price: number | null;
  exchange_count: number | null;
  cross_exchange_spread_pct: number | null;
  median_bid_ask_spread_pct: number | null;
  median_volume: number | null;
}

export interface MarketReference {
  symbol: string;
  refHour: string;
  refPrice: number;
  exchangeCount: number;
  crossExchangeSpreadPct: number | null;
  medianBidAskSpreadPct: number | null;
  medianVolume: number | null;
}

export interface MarketReferenceContext {
  divergencePct: number;
  exchangeCount: number;
  crossExchangeSpreadPct: number;
  medianBidAskSpreadPct: number;
  /** Natural log of 1 + median 24h base volume; bounded scale for trees. */
  logVolume: number;
}

const cache = new TTLCache({ maxSize: 64 }); // 60s default TTL

/** Test hook — clears the module-level cache between tests. */
export function resetMarketReferenceCacheForTests(): void {
  cache.clear();
}

/**
 * Latest usable hourly reference for a symbol, or null when absent/stale.
 * Stale (>= MAX_REF_AGE_HOURS behind now) is treated as absent — fail-closed.
 */
export async function getMarketReference(symbol: string): Promise<MarketReference | null> {
  const key = symbol.toUpperCase();
  const cached = cache.get<MarketReference>(key);
  if (cached !== null) return cached;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('market_reference_hourly')
      .select(
        'symbol, ref_hour, ref_price, exchange_count, cross_exchange_spread_pct, median_bid_ask_spread_pct, median_volume'
      )
      .eq('symbol', key)
      .order('ref_hour', { ascending: false })
      .limit(1);

    if (error) {
      logger.warn('failed to read market reference rollup', { symbol: key, error: error.message });
      return null;
    }
    const row = (data?.[0] ?? null) as HourlyRefRow | null;
    if (!row || typeof row.ref_price !== 'number' || !(row.ref_price > 0)) return null;

    const ageHours = (Date.now() - new Date(row.ref_hour).getTime()) / 3600_000;
    if (ageHours > MAX_REF_AGE_HOURS) {
      logger.warn('market reference stale — treating as absent', {
        symbol: key,
        refHour: row.ref_hour,
        ageHours: roundTo(ageHours, 2),
      });
      return null;
    }

    const ref: MarketReference = {
      symbol: key,
      refHour: row.ref_hour,
      refPrice: row.ref_price,
      exchangeCount: row.exchange_count ?? 0,
      crossExchangeSpreadPct: row.cross_exchange_spread_pct,
      medianBidAskSpreadPct: row.median_bid_ask_spread_pct,
      medianVolume: row.median_volume,
    };
    cache.set(key, ref, 60_000);
    return ref;
  } catch (error) {
    logger.warn('market reference client failed', {
      symbol: key,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Oracle-vs-market divergence in percent: |consensus - ref| / ref * 100.
 * Null when there is no usable reference (fail-closed, no zero fill) or when
 * the consensus price is unusable.
 */
export async function computeMarketDivergencePct(
  symbol: string,
  consensusPrice: number | null | undefined
): Promise<number | null> {
  return (await computeMarketReferenceContext(symbol, consensusPrice))?.divergencePct ?? null;
}

/**
 * Full market context for the ML feature vector, obtained from the same single
 * cached rollup read as divergence. Null remains explicit missing evidence.
 */
export async function computeMarketReferenceContext(
  symbol: string,
  consensusPrice: number | null | undefined
): Promise<MarketReferenceContext | null> {
  if (typeof consensusPrice !== 'number' || !(consensusPrice > 0)) return null;
  const ref = await getMarketReference(symbol);
  if (!ref) return null;
  return {
    divergencePct: roundTo((Math.abs(consensusPrice - ref.refPrice) / ref.refPrice) * 100, 4),
    exchangeCount: Math.max(0, ref.exchangeCount),
    crossExchangeSpreadPct: roundTo(Math.max(0, ref.crossExchangeSpreadPct ?? 0), 4),
    medianBidAskSpreadPct: roundTo(Math.max(0, ref.medianBidAskSpreadPct ?? 0), 4),
    logVolume: roundTo(Math.log1p(Math.max(0, ref.medianVolume ?? 0)), 4),
  };
}
