import { roundTo } from '@/lib/utils/format';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('oracle-watch-history');

/**
 * Shared historical cross-oracle feature mining, extracted from the pre-trade
 * safety service so the Oracle Watch signal can reuse the SAME feature
 * semantics as training (mirrors build_hourly_frame() in ml/train.py).
 *
 * One bounded hourly_price_snapshots read serves several consumers: the
 * v2 ML temporal features for the pre-trade check AND the Oracle Watch
 * forward-looking ML manipulation risk score.
 */

/** Per-hour cross-oracle state, mined from hourly_price_snapshots. */
export interface HourlyPoint {
  hour: string;
  maxDeviationPct: number;
  consensusPrice: number;
  participantCount: number;
}

/** Result of the shared historical fetch — drives BOTH ML features + anomaly. */
export interface HistoricalOracleState {
  /** Completed hourly points, OLDEST first. Empty on fetch failure. */
  history: HourlyPoint[];
  /** v2 ML temporal features (0 when history is insufficient). */
  deviationVelocity1h: number;
  deviationVelocity3h: number;
  participantCountDelta1h: number;
  rollingVolatility6h: number;
  maxDeviationZscore24h: number;
}

export const EMPTY_HISTORY: HistoricalOracleState = {
  history: [],
  deviationVelocity1h: 0,
  deviationVelocity3h: 0,
  participantCountDelta1h: 0,
  rollingVolatility6h: 0,
  maxDeviationZscore24h: 0,
};

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function round4(x: number): number {
  return Number.isFinite(x) ? roundTo(x, 4) : 0;
}

/** What the live check contributes to the ML feature vector. */
export interface OracleWatchLiveState {
  maxDeviationPct: number;
  consensusPrice: number;
  participantCount: number;
}

/**
 * Fetch the last ~30h of hourly snapshots for `asset` and compute the 5 temporal
 * ML features (deviation_velocity_1h/3h, participant_count_delta_1h,
 * rolling_volatility_6h, max_deviation_zscore_24h). Fault-tolerant: any error
 * returns EMPTY_HISTORY so the ML score degrades to "no temporal signal"
 * rather than failing the check.
 *
 * A snapshot <45 min old is the still-forming current hour and is excluded from
 * the COMPLETED history used for velocities, matching training's
 * max_dev(T) - max_dev(T-1).
 */
export async function fetchHistoricalOracleState(
  asset: string,
  live: OracleWatchLiveState
): Promise<HistoricalOracleState> {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const client = createServiceRoleClient();
    const cutoff = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    const { data, error } = await client
      .from('hourly_price_snapshots')
      .select('snapshot_hour,deviation_pct,price')
      .eq('symbol', asset)
      .eq('is_success', true)
      .gte('snapshot_hour', cutoff)
      .order('snapshot_hour', { ascending: true })
      .limit(2000);
    if (error || !data || data.length === 0) return EMPTY_HISTORY;

    // Group by hour -> max |deviation|, median price (consensus), participant count.
    const byHour = new Map<string, { devs: number[]; prices: number[]; count: number }>();
    for (const row of data) {
      const dev = Math.abs(Number(row.deviation_pct));
      const price = Number(row.price);
      if (!Number.isFinite(dev) || !Number.isFinite(price) || price <= 0) continue;
      const h = byHour.get(row.snapshot_hour) ?? { devs: [], prices: [], count: 0 };
      h.devs.push(dev);
      h.prices.push(price);
      h.count += 1;
      byHour.set(row.snapshot_hour, h);
    }
    if (byHour.size === 0) return EMPTY_HISTORY;

    const now = Date.now();
    const allHours = Array.from(byHour.keys()).sort(); // ascending ISO hour
    // Completed hours only (>= 45 min old): exclude the still-forming current hour.
    const completed: HourlyPoint[] = [];
    for (const hour of allHours) {
      const t = Date.parse(hour);
      if (Number.isNaN(t) || now - t < 45 * 60 * 1000) continue;
      const h = byHour.get(hour)!;
      completed.push({
        hour,
        maxDeviationPct: Math.max(...h.devs),
        consensusPrice: median(h.prices),
        participantCount: h.count,
      });
    }
    if (completed.length === 0) return { ...EMPTY_HISTORY, history: [] };

    const n = completed.length;
    const last = completed[n - 1];
    const lastMinus2 = n >= 3 ? completed[n - 3] : null;

    // Rolling 6h volatility of 1h consensus returns (std of pct-change, %).
    const series = completed.slice(-6);
    const returns: number[] = [];
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1].consensusPrice;
      if (prev > 0) returns.push((series[i].consensusPrice - prev) / prev);
    }
    const rollingVolatility6h = returns.length >= 2 ? std(returns) * 100 : 0;

    // 24h z-score of max deviation: (live - mean24) / std24 over completed history.
    const devs = completed.map((p) => p.maxDeviationPct);
    const mean = devs.reduce((s, v) => s + v, 0) / devs.length;
    const devStd = std(devs);
    const maxDeviationZscore24h = devStd > 1e-9 ? (live.maxDeviationPct - mean) / devStd : 0;

    return {
      history: completed,
      deviationVelocity1h: round4(live.maxDeviationPct - last.maxDeviationPct),
      deviationVelocity3h: lastMinus2
        ? round4(live.maxDeviationPct - lastMinus2.maxDeviationPct)
        : 0,
      participantCountDelta1h: live.participantCount - last.participantCount,
      rollingVolatility6h: round4(rollingVolatility6h),
      maxDeviationZscore24h: round4(maxDeviationZscore24h),
    };
  } catch (error) {
    logger.warn('Historical oracle state fetch failed; using zeros', {
      asset,
      error: normalizeError(error),
    });
    return EMPTY_HISTORY;
  }
}
