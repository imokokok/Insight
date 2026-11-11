import { isCadenceStale } from '@/lib/oracles/feedCadence';

import type { ProviderPriceDetail } from './contracts';

function inConsensusOrAll<T>(
  providers: [string, T][],
  isOutlier: (detail: T) => boolean
): [string, T][] {
  const kept = providers.filter(([, detail]) => !isOutlier(detail));
  return kept.length > 0 ? kept : providers;
}

function filterProviders(
  providerPrices: Record<string, ProviderPriceDetail>,
  targetProviders?: string[]
): [string, ProviderPriceDetail][] {
  const entries = Object.entries(providerPrices);
  return targetProviders && targetProviders.length > 0
    ? entries.filter(([provider]) => targetProviders.includes(provider))
    : entries;
}

/** Maximum absolute deviation among quorum-counted, consensus-valid providers. */
export function computeMaxDeviation(
  providerPrices: Record<string, ProviderPriceDetail>,
  targetProviders?: string[]
): number {
  const successful = filterProviders(providerPrices, targetProviders).filter(
    ([, detail]) =>
      detail.status === 'success' && detail.countsTowardOracleQuorum && detail.deviationPct !== null
  );
  if (successful.length === 0) return 0;
  const scored = inConsensusOrAll(successful, (detail) => detail.isOutlier);
  return Math.max(...scored.map(([, detail]) => Math.abs(detail.deviationPct as number)));
}

/** Cross-provider price span as a percentage of the min/max midpoint. */
export function computeSpread(
  providerPrices: Record<string, ProviderPriceDetail>,
  targetProviders?: string[]
): number {
  const successful = filterProviders(providerPrices, targetProviders).filter(
    ([, detail]) =>
      detail.status === 'success' && detail.countsTowardOracleQuorum && detail.price > 0
  );
  const prices = inConsensusOrAll(successful, (detail) => detail.isOutlier).map(
    ([, detail]) => detail.price
  );
  if (prices.length < 2) return 0;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const midpoint = (min + max) / 2;
  return midpoint > 0 ? ((max - min) / midpoint) * 100 : 0;
}

/** Cadence-relative staleness for quorum-counted successful providers. */
export function computeStaleRisk(
  providerPrices: Record<string, ProviderPriceDetail>,
  stalenessBaselines: Map<string, number | null>
): { staleRisk: boolean; maxAge: number; staleProviders: string[] } {
  const entries = Object.entries(providerPrices).filter(
    ([, detail]) =>
      detail.status === 'success' &&
      detail.countsTowardOracleQuorum &&
      detail.dataAgeSeconds !== null
  );
  if (entries.length === 0) return { staleRisk: false, maxAge: 0, staleProviders: [] };
  let maxAge = 0;
  const staleProviders: string[] = [];
  for (const [provider, detail] of entries) {
    const age = detail.dataAgeSeconds as number;
    maxAge = Math.max(maxAge, age);
    if (isCadenceStale(age, stalenessBaselines.get(provider) ?? null))
      staleProviders.push(provider);
  }
  return { staleRisk: staleProviders.length > 0, maxAge, staleProviders };
}
