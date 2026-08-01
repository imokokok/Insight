import { createServiceRoleClient } from '@/lib/supabase/server';
import { addDay } from '@/lib/utils/date';

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
  latencyDataAvailable: boolean;
  overall: {
    p50: number | null;
    p90: number | null;
    p95: number | null;
    p99: number | null;
  } | null;
  entries: LatencyEntry[];
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Query and aggregate oracle latency statistics from hourly_price_snapshots.
 * Shared between the v1/latency API route and the MCP get_latency tool.
 * Does not handle HTTP response formatting or MCP text rendering.
 */
export async function getLatencyStatistics(
  input: LatencyServiceInput
): Promise<LatencyServiceResult> {
  const { provider, symbol, from, to } = input;

  const supabase = createServiceRoleClient();

  let query = supabase
    .from('hourly_price_snapshots')
    .select('provider, symbol, latency_ms, is_success, snapshot_hour')
    .gte('snapshot_hour', from)
    .lt('snapshot_hour', addDay(to));

  if (provider) {
    query = query.eq('provider', provider);
  }
  if (symbol) {
    query = query.eq('symbol', symbol);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch latency data: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    provider: string;
    symbol: string;
    latency_ms: number | null;
    is_success: boolean;
    snapshot_hour: string;
  }>;

  const groupMap = new Map<
    string,
    {
      provider: string;
      symbol: string;
      latencies: number[];
      total: number;
      successes: number;
    }
  >();

  for (const row of rows) {
    const key = `${row.provider}|${row.symbol}`;
    let group = groupMap.get(key);
    if (!group) {
      group = {
        provider: row.provider,
        symbol: row.symbol,
        latencies: [],
        total: 0,
        successes: 0,
      };
      groupMap.set(key, group);
    }
    group.total++;
    if (row.is_success) group.successes++;
    if (row.latency_ms != null) {
      group.latencies.push(row.latency_ms);
    }
  }

  const entries = Array.from(groupMap.values()).map((group) => {
    const sorted = group.latencies.sort((a, b) => a - b);
    return {
      provider: group.provider,
      symbol: group.symbol,
      sampleSize: sorted.length,
      successRate: group.total > 0 ? (group.successes / group.total) * 100 : 0,
      min: sorted.length > 0 ? sorted[0] : null,
      max: sorted.length > 0 ? sorted[sorted.length - 1] : null,
      mean:
        sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : null,
      p50: percentile(sorted, 50),
      p90: percentile(sorted, 90),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
    };
  });

  const allLatencies = entries.flatMap((e) => (e.mean != null ? [e.mean] : []));
  const overallSorted = allLatencies.sort((a, b) => a - b);
  const hasLatencyData = entries.some((e) => e.sampleSize > 0);

  return {
    from,
    to,
    latencyDataAvailable: hasLatencyData,
    overall: hasLatencyData
      ? {
          p50: percentile(overallSorted, 50),
          p90: percentile(overallSorted, 90),
          p95: percentile(overallSorted, 95),
          p99: percentile(overallSorted, 99),
        }
      : null,
    entries,
  };
}
