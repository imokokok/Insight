import { z } from 'zod';

import { TTLCache } from '@/lib/utils/cache';
import { roundTo } from '@/lib/utils/format';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('oracle-watch-history');

/**
 * Minimum completed hourly points before the 24h z-score means anything.
 * Mirrors training's `rolling(24, min_periods=3)` in ml/train.py: with fewer
 * points the "24h baseline" is not a 24h baseline, and serving a statistic the
 * model was never fitted on is a train/serve mismatch.
 */
const MIN_POINTS_FOR_ZSCORE = 3;

/**
 * Bound on |z|. The baseline window can contain a feed that is simply wrong —
 * a cross-rate registered as a USD quote sits at a fixed ~-86% for weeks,
 * pulling the baseline mean dozens of points away from any live value and
 * producing z-scores in the hundreds. Those are artefacts, not signal, and are
 * equally outside anything the model saw in training.
 *
 * Safe for the pre-trade lending freeze, which only compares
 * `maxDeviationZscore24h >= 1.0`: clamping to ±ZSCORE_CLAMP leaves every value
 * that could ever cross that threshold untouched.
 */
const ZSCORE_CLAMP = 10;

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

/** Sample standard deviation (ddof=1), matching pandas.Series.std(). */
function sampleStd(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt((variance * values.length) / (values.length - 1));
}

function round4(x: number): number {
  return Number.isFinite(x) ? roundTo(x, 4) : 0;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** What the live check contributes to the ML feature vector. */
export interface OracleWatchLiveState {
  maxDeviationPct: number;
  consensusPrice: number;
  participantCount: number;
}

const historyCache = new TTLCache({ maxSize: 128, cleanupIntervalMs: 0 });
const historyReads = new Map<string, Promise<HourlyPoint[]>>();
const baselineSchema = z
  .array(
    z.object({
      hour: z.string().refine((value) => Number.isFinite(Date.parse(value))),
      max_deviation_pct: z.number().finite().nonnegative(),
      consensus_price: z.number().finite().positive(),
      participant_count: z.number().int().positive().safe(),
    })
  )
  .max(30);

export function clearOracleHistoryCache(): void {
  historyCache.clear();
  historyReads.clear();
}

async function loadCompletedHistory(asset: string, now: number): Promise<HourlyPoint[]> {
  const hour = Math.floor(now / 3600_000) * 3600_000;
  // Preserve the old rolling 30h cutoff exactly for hour-grained records.
  const since = Math.ceil((now - 30 * 3600_000) / 3600_000) * 3600_000;
  const symbol = asset.toUpperCase();
  const key = JSON.stringify([symbol, since, hour]);
  const cached = historyCache.get<HourlyPoint[]>(key);
  if (cached) return cached;
  const pending = historyReads.get(key);
  if (pending) return pending;
  const read = (async () => {
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const { data, error } = await createServiceRoleClient()
      .rpc('get_oracle_history_baseline', {
        p_symbol: symbol,
        p_since: new Date(since).toISOString(),
        p_before: new Date(hour).toISOString(),
      })
      .abortSignal(AbortSignal.timeout(10_000));
    if (error) throw error;
    const rows = baselineSchema.parse(data);
    const seen = new Set<number>();
    const points = rows
      .map((row) => {
        const time = Date.parse(row.hour);
        if (time < since || time >= hour || time % 3600_000 !== 0 || seen.has(time)) {
          throw new Error('Invalid completed-hour baseline');
        }
        seen.add(time);
        return {
          hour: row.hour,
          maxDeviationPct: row.max_deviation_pct,
          consensusPrice: row.consensus_price,
          participantCount: row.participant_count,
        };
      })
      .sort((a, b) => Date.parse(a.hour) - Date.parse(b.hour));
    // Cache historical evidence only. Live features are evaluated per call.
    historyCache.set(key, points, 60_000);
    return points;
  })().finally(() => historyReads.delete(key));
  historyReads.set(key, read);
  return read;
}

/**
 * Fetch the last ~30h of hourly snapshots for `asset` and compute the 5 temporal
 * ML features (deviation_velocity_1h/3h, participant_count_delta_1h,
 * rolling_volatility_6h, max_deviation_zscore_24h). Fault-tolerant: any error
 * returns EMPTY_HISTORY so the ML score degrades to "no temporal signal"
 * rather than failing the check.
 *
 * The current wall-clock hour is excluded from completed history. Temporal
 * deltas use exact T-1h/T-3h keys, matching the trainer even when data has gaps.
 */
export async function fetchHistoricalOracleState(
  asset: string,
  live: OracleWatchLiveState
): Promise<HistoricalOracleState> {
  try {
    let now = Date.now();
    let completed = await loadCompletedHistory(asset, now);
    // Do not reuse a baseline from the previous hour across a slow read.
    if (Math.floor(Date.now() / 3600_000) !== Math.floor(now / 3600_000)) {
      now = Date.now();
      completed = await loadCompletedHistory(asset, now);
    }
    const currentHour = Math.floor(now / 3600_000) * 3600_000;
    if (completed.length === 0) return { ...EMPTY_HISTORY, history: [] };

    const byTimestamp = new Map(completed.map((point) => [Date.parse(point.hour), point]));
    const oneHourAgo = byTimestamp.get(currentHour - 3600_000) ?? null;
    const threeHoursAgo = byTimestamp.get(currentHour - 3 * 3600_000) ?? null;

    // Rolling six 1h returns, including the live T/T-1 return. Exact timestamp
    // lookup means a missing hour never becomes a multi-hour "1h return".
    const returns: number[] = [];
    const priceAtOffset = (offsetHours: number): number | null => {
      if (offsetHours === 0) return live.consensusPrice;
      return byTimestamp.get(currentHour - offsetHours * 3600_000)?.consensusPrice ?? null;
    };
    for (let offset = 5; offset >= 0; offset--) {
      const current = priceAtOffset(offset);
      const previous = priceAtOffset(offset + 1);
      if (current !== null && previous !== null && previous > 0) {
        returns.push((current - previous) / previous);
      }
    }
    const rollingVolatility6h = returns.length >= 2 ? sampleStd(returns) * 100 : 0;

    // 24h z-score of max deviation: (live - mean24) / std24 over completed history.
    // Requires enough completed hours to be a 24h baseline at all, and is bounded
    // so a single mis-registered feed inside the window cannot push the feature
    // hundreds of standard deviations out of range.
    const devs: number[] = [];
    for (let offset = 1; offset <= 24; offset++) {
      const point = byTimestamp.get(currentHour - offset * 3600_000);
      if (point) devs.push(point.maxDeviationPct);
    }
    const mean = devs.reduce((s, v) => s + v, 0) / devs.length;
    const devStd = sampleStd(devs);
    const maxDeviationZscore24h =
      devs.length >= MIN_POINTS_FOR_ZSCORE && devStd > 1e-9
        ? clamp((live.maxDeviationPct - mean) / devStd, -ZSCORE_CLAMP, ZSCORE_CLAMP)
        : 0;

    return {
      history: completed.map((point) => ({ ...point })),
      deviationVelocity1h: oneHourAgo
        ? round4(live.maxDeviationPct - oneHourAgo.maxDeviationPct)
        : 0,
      deviationVelocity3h: threeHoursAgo
        ? round4(live.maxDeviationPct - threeHoursAgo.maxDeviationPct)
        : 0,
      participantCountDelta1h: oneHourAgo ? live.participantCount - oneHourAgo.participantCount : 0,
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
