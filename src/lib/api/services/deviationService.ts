import { createServiceRoleClient } from '@/lib/supabase/server';
import { startOfDayUtc, endOfDayExclusiveUtc } from '@/lib/utils/date';

export type DeviationInterval = '1h' | '6h' | '24h';

export interface DeviationServiceInput {
  symbol: string;
  from: string;
  to: string;
  interval: DeviationInterval;
}

export interface DeviationProviderAggregate {
  provider: string;
  snapshots: number;
  avgDeviationPct: number;
  maxDeviationPct: number;
  avgLatencyMs: number;
  successRate: number;
}

export interface DeviationTimelineBucket {
  timestamp: string;
  consensusPrice: number | null;
  providers: Record<string, { price: number; deviationPct: number | null }>;
}

export interface DeviationServiceResult {
  symbol: string;
  dateRange: {
    from: string;
    to: string;
  };
  providers: DeviationProviderAggregate[];
  timeline: DeviationTimelineBucket[];
}

interface SnapshotRow {
  snapshot_hour: string;
  provider: string;
  price: number;
  consensus_price: number | null;
  deviation_pct: number | null;
  latency_ms: number | null;
  is_success: boolean;
}

/**
 * Fetch hourly price snapshots and aggregate per-provider deviation statistics
 * plus a bucketed timeline for charting.
 * Currently consumed by the v1/deviation API route; extracted so the heavy
 * aggregation logic can be reused or unit-tested independently of HTTP.
 */
export async function getDeviationTimeline(
  input: DeviationServiceInput
): Promise<DeviationServiceResult> {
  const { symbol, from, to, interval } = input;

  const fromAt = startOfDayUtc(from);
  const toEndAtIso = endOfDayExclusiveUtc(to);

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('hourly_price_snapshots')
    .select(
      'snapshot_hour, provider, price, consensus_price, deviation_pct, latency_ms, is_success'
    )
    .eq('symbol', symbol)
    .gte('snapshot_hour', fromAt)
    .lt('snapshot_hour', toEndAtIso)
    .order('snapshot_hour', { ascending: true });

  if (error) {
    throw new Error(`Failed to load deviation data: ${error.message}`);
  }

  const rows = (data ?? []) as SnapshotRow[];

  const providerAggMap = new Map<
    string,
    {
      snapshots: number;
      successes: number;
      deviations: number[];
      maxDeviation: number;
      latencies: number[];
    }
  >();

  for (const row of rows) {
    let agg = providerAggMap.get(row.provider);
    if (!agg) {
      agg = { snapshots: 0, successes: 0, deviations: [], maxDeviation: 0, latencies: [] };
      providerAggMap.set(row.provider, agg);
    }
    agg.snapshots++;
    if (row.deviation_pct != null) {
      const absDev = Math.abs(row.deviation_pct);
      agg.deviations.push(absDev);
      agg.maxDeviation = Math.max(agg.maxDeviation, absDev);
    }
    if (row.latency_ms != null) {
      agg.latencies.push(row.latency_ms);
    }
    if (row.is_success) {
      agg.successes++;
    }
  }

  const providers = Array.from(providerAggMap.entries()).map(([provider, agg]) => ({
    provider,
    snapshots: agg.snapshots,
    avgDeviationPct:
      agg.deviations.length > 0
        ? agg.deviations.reduce((a, b) => a + b, 0) / agg.deviations.length
        : 0,
    maxDeviationPct: agg.maxDeviation,
    avgLatencyMs:
      agg.latencies.length > 0
        ? Math.round(agg.latencies.reduce((a, b) => a + b, 0) / agg.latencies.length)
        : 0,
    successRate: agg.snapshots > 0 ? (agg.successes / agg.snapshots) * 100 : 0,
  }));

  const intervalMs =
    interval === '1h' ? 3_600_000 : interval === '6h' ? 6 * 3_600_000 : 24 * 3_600_000;

  const timelineMap = new Map<
    string,
    {
      timestamp: string;
      consensusPrice: number | null;
      providers: Record<string, { price: number; deviationPct: number | null }>;
    }
  >();

  for (const row of rows) {
    const bucketTime = Math.floor(new Date(row.snapshot_hour).getTime() / intervalMs) * intervalMs;
    const bucketKey = new Date(bucketTime).toISOString();

    let bucket = timelineMap.get(bucketKey);
    if (!bucket) {
      bucket = { timestamp: bucketKey, consensusPrice: null, providers: {} };
      timelineMap.set(bucketKey, bucket);
    }

    bucket.providers[row.provider] = {
      price: row.price,
      deviationPct: row.deviation_pct,
    };

    if (bucket.consensusPrice == null && row.consensus_price != null) {
      bucket.consensusPrice = row.consensus_price;
    }
  }

  const timeline = Array.from(timelineMap.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );

  return {
    symbol,
    dateRange: { from, to },
    providers,
    timeline,
  };
}
