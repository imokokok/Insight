import {
  CAUTION_STALE_MULTIPLIER,
  HARD_STALE_BLOCK_SECONDS,
  STALE_FLOOR_SECONDS,
} from '@/lib/oracles/feedCadence';

import type { ContributingFactor, ProviderPriceDetail, SafetyVerdict } from './contracts';

const STALE_DIVERGENCE_BLOCK_PCT = 2;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function classify(providerPrices: Record<string, ProviderPriceDetail>) {
  const successful = Object.entries(providerPrices).filter(
    ([, detail]) =>
      detail.status === 'success' &&
      detail.countsTowardOracleQuorum &&
      detail.dataAgeSeconds !== null &&
      detail.price > 0
  );
  const stale = successful.filter(
    ([, detail]) => (detail.dataAgeSeconds as number) >= HARD_STALE_BLOCK_SECONDS
  );
  if (!stale.length) return { hardBlock: false, hard: [] as string[], anomaly: [] as string[] };
  const fresh = successful
    .filter(([, detail]) => (detail.dataAgeSeconds as number) < HARD_STALE_BLOCK_SECONDS)
    .map(([, detail]) => detail.price);
  if (!fresh.length)
    return { hardBlock: true, hard: stale.map(([provider]) => provider), anomaly: [] as string[] };
  const reference = median(fresh);
  const hard: string[] = [],
    anomaly: string[] = [];
  for (const [provider, detail] of stale) {
    const deviation = reference > 0 ? (Math.abs(detail.price - reference) / reference) * 100 : 0;
    (deviation > STALE_DIVERGENCE_BLOCK_PCT ? hard : anomaly).push(provider);
  }
  return { hardBlock: hard.length > 0, hard, anomaly };
}

/** Apply cadence caution plus consensus-aware absolute staleness backstop. */
export function evaluateStalenessRules(params: {
  providerPrices: Record<string, ProviderPriceDetail>;
  stalenessBaselines: Map<string, number | null>;
  maxAge: number;
  staleProviders: string[];
  staleRisk: boolean;
}): { verdict: SafetyVerdict | null; factors: ContributingFactor[]; warnings: string[] } {
  const factors: ContributingFactor[] = [],
    warnings: string[] = [];
  let verdict: SafetyVerdict | null = null;
  if (params.staleRisk) {
    verdict = 'CAUTION';
    const baselines = params.staleProviders
      .map((provider) => params.stalenessBaselines.get(provider) ?? 0)
      .filter((value) => value > 0);
    const threshold = baselines.length
      ? CAUTION_STALE_MULTIPLIER * Math.min(...baselines)
      : STALE_FLOOR_SECONDS;
    factors.push({
      rule: 'data_stale_seconds',
      value: params.maxAge,
      threshold,
      triggeredVerdict: 'CAUTION',
      message: `Stale oracle data: ${params.staleProviders.join(', ')} exceed their observed update cadence (max age ${params.maxAge}s).`,
    });
    warnings.push(`Oracle data is stale vs its own cadence (max age ${params.maxAge}s).`);
  }
  const result = classify(params.providerPrices);
  for (const [provider, detail] of Object.entries(params.providerPrices))
    detail.timestampAnomaly = result.anomaly.includes(provider);
  if (result.hardBlock) {
    verdict = 'BLOCK';
    factors.push({
      rule: 'data_stale_seconds',
      value: params.maxAge,
      threshold: HARD_STALE_BLOCK_SECONDS,
      triggeredVerdict: 'BLOCK',
      message: `Oracle data extremely stale AND diverges from consensus: ${result.hard.join(', ')} (max age ${params.maxAge}s >= ${HARD_STALE_BLOCK_SECONDS}s absolute backstop).`,
    });
    warnings.push(`Oracle data is extremely stale (max age ${params.maxAge}s).`);
  }
  if (result.anomaly.length) {
    verdict = verdict === 'BLOCK' ? verdict : 'CAUTION';
    factors.push({
      rule: 'data_stale_timestamp_anomaly',
      value: params.maxAge,
      threshold: HARD_STALE_BLOCK_SECONDS,
      triggeredVerdict: 'CAUTION',
      message: `Stale timestamp but price in consensus: ${result.anomaly.join(', ')} (max age ${params.maxAge}s) — likely a timestamp-source anomaly, not dead data.`,
    });
    warnings.push(
      `Stale timestamp reported by ${result.anomaly.join(', ')} but price agrees with consensus (possible timestamp-source anomaly).`
    );
  }
  return { verdict, factors, warnings };
}
