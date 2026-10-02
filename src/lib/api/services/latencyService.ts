import { z } from 'zod';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { loadSnapshotHistoryPage } from '@/lib/supabase/snapshotHistory';
import { addDay, endOfDayExclusiveUtc, startOfDayUtc } from '@/lib/utils/date';

export interface LatencyServiceInput {
  from: string;
  to: string;
  provider?: string;
  symbol?: string;
}

export interface LatencyEntry {
  provider: string;
  symbol: string;
  sampleSize: number;
  successRate: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  p50: number | null;
  p90: number | null;
  p95: number | null;
  p99: number | null;
}

export interface LatencyServiceResult {
  from: string;
  to: string;
  observationSource: 'price_snapshots' | 'hourly_price_snapshots';
  latencyDataAvailable: boolean;
  sampleSize: number;
  rowsExamined: number;
  truncated: boolean;
  overall: {
    p50: number | null;
    p90: number | null;
    p95: number | null;
    p99: number | null;
  } | null;
  entries: LatencyEntry[];
}

const nonnegativeCount = z.number().int().nonnegative().safe();
const duration = z.number().int().nonnegative().nullable();
const percentiles = z.object({
  p50: duration,
  p90: duration,
  p95: duration,
  p99: duration,
});
const latencyStatisticsSchema = z
  .object({
    rowsExamined: nonnegativeCount,
    sampleSize: nonnegativeCount,
    overall: percentiles.nullable(),
    entries: z.array(
      percentiles.extend({
        provider: z.string().min(1),
        symbol: z.string().min(1),
        sampleSize: nonnegativeCount,
        successRate: z.number().finite().min(0).max(100),
        min: duration,
        max: duration,
        mean: duration,
      })
    ),
  })
  .refine(
    (result) =>
      result.rowsExamined >= result.sampleSize &&
      (result.overall !== null) === result.sampleSize > 0 &&
      result.entries.reduce((sum, entry) => sum + entry.sampleSize, 0) === result.sampleSize,
    'Incomplete latency aggregate'
  );

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

/** Preserve the existing endpoint until migration 0074 is installed. */
async function getHourlyFallback(input: LatencyServiceInput): Promise<LatencyServiceResult> {
  const { provider, symbol, from, to } = input;
  const page = await loadSnapshotHistoryPage(
    createServiceRoleClient(),
    'hourly',
    from,
    addDay(to),
    ['provider', 'symbol', 'latency_ms', 'is_success', 'snapshot_hour'],
    { providers: provider ? [provider] : undefined, symbol, ascending: true, limit: 10001 }
  );
  const rows = page.slice(0, 10000);
  const groups = new Map<
    string,
    { provider: string; symbol: string; total: number; successes: number; latencies: number[] }
  >();
  for (const row of rows) {
    const key = `${row.provider}|${row.symbol}`;
    let group = groups.get(key);
    if (!group) {
      group = { provider: row.provider, symbol: row.symbol, total: 0, successes: 0, latencies: [] };
      groups.set(key, group);
    }
    group.total++;
    if (row.is_success) group.successes++;
    if (row.latency_ms != null && Number.isFinite(row.latency_ms) && row.latency_ms >= 0) {
      group.latencies.push(row.latency_ms);
    }
  }
  const entries = [...groups.values()].map((group) => {
    const sorted = group.latencies.sort((a, b) => a - b);
    return {
      provider: group.provider,
      symbol: group.symbol,
      sampleSize: sorted.length,
      successRate: (group.successes / group.total) * 100,
      min: sorted[0] ?? null,
      max: sorted[sorted.length - 1] ?? null,
      mean:
        sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : null,
      p50: percentile(sorted, 50),
      p90: percentile(sorted, 90),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
    };
  });
  const allLatencies = [...groups.values()]
    .flatMap((group) => group.latencies)
    .sort((a, b) => a - b);
  return {
    from,
    to,
    observationSource: 'hourly_price_snapshots',
    latencyDataAvailable: allLatencies.length > 0,
    sampleSize: allLatencies.length,
    rowsExamined: rows.length,
    truncated: page.length > 10000,
    overall:
      allLatencies.length > 0
        ? {
            p50: percentile(allLatencies, 50),
            p90: percentile(allLatencies, 90),
            p95: percentile(allLatencies, 95),
            p99: percentile(allLatencies, 99),
          }
        : null,
    entries,
  };
}

/**
 * Complete 15-minute collector statistics, aggregated inside Postgres across
 * hot and archived observations. Before migration 0074 is installed, retain
 * the former hourly result and identify its distinct sampling source.
 */
export async function getLatencyStatistics(
  input: LatencyServiceInput
): Promise<LatencyServiceResult> {
  const { provider, symbol, from, to } = input;
  const { data, error } = await createServiceRoleClient()
    .rpc('get_oracle_latency_statistics', {
      p_from: startOfDayUtc(from),
      p_before: endOfDayExclusiveUtc(to),
      p_provider: provider ?? null,
      p_symbol: symbol ?? null,
    })
    .abortSignal(AbortSignal.timeout(30_000));
  if (error?.code === 'PGRST202' || error?.code === '42883') {
    return getHourlyFallback(input);
  }
  if (error) throw new Error(`Latency statistics read failed: ${error.message}`);

  const statistics = latencyStatisticsSchema.parse(data);
  return {
    from,
    to,
    observationSource: 'price_snapshots',
    latencyDataAvailable: statistics.sampleSize > 0,
    sampleSize: statistics.sampleSize,
    rowsExamined: statistics.rowsExamined,
    truncated: false,
    overall: statistics.overall,
    entries: statistics.entries,
  };
}
