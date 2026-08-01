import { createServiceRoleClient } from '@/lib/supabase/server';
import { addDay } from '@/lib/utils/date';

export interface CorrelationServiceInput {
  symbol: string;
  from: string;
  to: string;
}

export interface CorrelationPair {
  provider1: string;
  provider2: string;
  correlation: number;
  interpretation: string;
}

export interface CorrelationServiceResult {
  symbol: string;
  from: string;
  to: string;
  dataPoints: number;
  providers: string[];
  matrix: Record<string, Record<string, number>>;
  pairs: CorrelationPair[];
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
  const meanY = ySlice.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xSlice[i] - meanX;
    const dy = ySlice[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return num / den;
}

function interpretCorrelation(correlation: number): string {
  const absCorr = Math.abs(correlation);
  if (absCorr >= 0.8) return 'Highly correlated - deviations tend to co-occur';
  if (absCorr >= 0.5) return 'Moderately correlated';
  if (absCorr >= 0.2) return 'Weakly correlated';
  return 'Independent - deviations are uncorrelated';
}

/**
 * Query hourly deviation snapshots and compute pairwise Pearson correlations
 * between oracle providers for a single asset.
 * Shared between the v1/correlation API route and the MCP get_correlation tool.
 */
export async function getCorrelationAnalysis(
  input: CorrelationServiceInput
): Promise<CorrelationServiceResult> {
  const { symbol, from, to } = input;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('hourly_price_snapshots')
    .select('snapshot_hour, provider, deviation_pct')
    .eq('symbol', symbol)
    .gte('snapshot_hour', from)
    .lt('snapshot_hour', addDay(to))
    .order('snapshot_hour', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch correlation data: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    snapshot_hour: string;
    provider: string;
    deviation_pct: number | null;
  }>;

  const providerSeries = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (row.deviation_pct == null) continue;
    if (!providerSeries.has(row.provider)) {
      providerSeries.set(row.provider, new Map());
    }
    providerSeries.get(row.provider)!.set(row.snapshot_hour, row.deviation_pct);
  }

  const providers = Array.from(providerSeries.keys()).sort();

  const allTimestamps = new Set<string>();
  for (const series of providerSeries.values()) {
    for (const ts of series.keys()) {
      allTimestamps.add(ts);
    }
  }
  const sortedTimestamps = Array.from(allTimestamps).sort();

  const alignedVectors: Record<string, number[]> = {};
  for (const provider of providers) {
    const series = providerSeries.get(provider)!;
    alignedVectors[provider] = sortedTimestamps.map((ts) => series.get(ts) ?? 0);
  }

  const matrix: Record<string, Record<string, number>> = {};
  for (const p1 of providers) {
    matrix[p1] = {};
    for (const p2 of providers) {
      if (p1 === p2) {
        matrix[p1][p2] = 1;
      } else if (matrix[p2]?.[p1] !== undefined) {
        matrix[p1][p2] = matrix[p2][p1];
      } else {
        matrix[p1][p2] = Number(
          pearsonCorrelation(alignedVectors[p1], alignedVectors[p2]).toFixed(4)
        );
      }
    }
  }

  const pairs: CorrelationPair[] = [];
  for (let i = 0; i < providers.length; i++) {
    for (let j = i + 1; j < providers.length; j++) {
      const corr = matrix[providers[i]][providers[j]];
      pairs.push({
        provider1: providers[i],
        provider2: providers[j],
        correlation: corr,
        interpretation: interpretCorrelation(corr),
      });
    }
  }

  pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  return {
    symbol,
    from,
    to,
    dataPoints: sortedTimestamps.length,
    providers,
    matrix,
    pairs,
  };
}
