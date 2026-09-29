import { z } from 'zod';

import { reputationService } from '@/lib/oracles/services/reputationService';
import type { PositionInput, OracleWarning } from '@/lib/protocols/protocolHealth';
import { STABLECOINS, type StablecoinSymbol } from '@/lib/stablecoins/config';
import {
  calculateAllStablecoinSnapshots,
  calculateStablecoinDepegSnapshot,
  type StablecoinDepegSnapshot,
} from '@/lib/stablecoins/monitor';
import { WRAPPED_ASSETS } from '@/lib/wrapped-assets/config';
import {
  calculateAllWrappedAssetSnapshots,
  calculateWrappedAssetSnapshot,
  type WrappedAssetSnapshot,
} from '@/lib/wrapped-assets/monitor';
import type { OracleProvider } from '@/types/oracle';

export const AssetEntrySchema = z.object({
  symbol: z.string().min(1),
  amount: z.number().positive(),
});

export const PositionSafetyRequestSchema = z
  .object({
    protocolId: z.string().min(1, 'Protocol ID is required'),
    collaterals: z.array(AssetEntrySchema).min(1, 'At least one collateral is required').optional(),
    borrows: z.array(AssetEntrySchema).min(1, 'At least one borrow is required').optional(),
    collateralSymbol: z.string().min(1).optional(),
    collateralAmount: z.number().positive().optional(),
    borrowSymbol: z.string().min(1).optional(),
    borrowAmount: z.number().positive().optional(),
  })
  .refine(
    (data) =>
      Boolean(
        (data.collaterals?.length && data.borrows?.length) ||
        (data.collateralSymbol && data.collateralAmount && data.borrowSymbol && data.borrowAmount)
      ),
    { message: 'Provide either collaterals/borrows arrays or single collateral/borrow fields' }
  );

export interface ProviderSymbolMapping {
  provider: OracleProvider;
  symbols: string[];
}

type Reputation = NonNullable<Awaited<ReturnType<typeof reputationService.getReputation>>>;

export async function fetchOracleReputations(
  mappings: readonly ProviderSymbolMapping[],
  onError?: (provider: OracleProvider) => void
): Promise<Map<OracleProvider, Reputation>> {
  const reputations = new Map<OracleProvider, Reputation>();
  const providers = [...new Set(mappings.map((mapping) => mapping.provider))];
  await Promise.all(
    providers.map(async (provider) => {
      try {
        const reputation = await reputationService.getReputation(provider);
        if (reputation) reputations.set(provider, reputation);
      } catch {
        onError?.(provider);
      }
    })
  );
  return reputations;
}

export interface OracleIssue {
  type: 'freshness' | 'reliability' | 'deviation' | 'uptime';
  value: number;
}

export function classifyOracleIssues(reputation: Reputation): {
  issues: OracleIssue[];
  messages: string[];
} {
  const issues: OracleIssue[] = [];
  const messages: string[] = [];
  if (reputation.freshness_score < 60) {
    messages.push(
      `Data freshness is low (${reputation.freshness_score.toFixed(0)}/100), price updates may be delayed`
    );
    issues.push({ type: 'freshness', value: reputation.freshness_score });
  }
  if (reputation.reliability_score < 60) {
    messages.push(
      `Reliability score is degraded (${reputation.reliability_score.toFixed(0)}/100), price may deviate from market`
    );
    issues.push({ type: 'reliability', value: reputation.reliability_score });
  }
  if (reputation.avg_deviation_pct > 0.5) {
    messages.push(
      `Average deviation from consensus is ${reputation.avg_deviation_pct.toFixed(2)}%, which may affect liquidation accuracy`
    );
    issues.push({ type: 'deviation', value: reputation.avg_deviation_pct });
  }
  if (reputation.uptime_percentage < 95) {
    messages.push(
      `Uptime is ${reputation.uptime_percentage.toFixed(1)}%, oracle outages could delay liquidation protection`
    );
    issues.push({ type: 'uptime', value: reputation.uptime_percentage });
  }
  return { issues, messages };
}

export function getPositionSymbols(input: PositionInput): string[] {
  const symbols = new Set<string>();
  for (const asset of input.collaterals ?? []) symbols.add(asset.symbol);
  for (const asset of input.borrows ?? []) symbols.add(asset.symbol);
  if (input.collateralSymbol) symbols.add(input.collateralSymbol);
  if (input.borrowSymbol) symbols.add(input.borrowSymbol);
  return Array.from(symbols);
}

export function mapPositionProviders(
  symbols: Iterable<string>,
  assets: readonly { symbol: string; oracleProvider: OracleProvider }[]
): ProviderSymbolMapping[] {
  const grouped = new Map<OracleProvider, Set<string>>();
  for (const symbol of symbols) {
    const asset = assets.find((candidate) => candidate.symbol === symbol);
    if (!asset) continue;
    const current = grouped.get(asset.oracleProvider) ?? new Set<string>();
    current.add(symbol);
    grouped.set(asset.oracleProvider, current);
  }
  return Array.from(grouped, ([provider, values]) => ({ provider, symbols: Array.from(values) }));
}

export function classifyOracleReputation(score: number): OracleWarning['level'] {
  return score >= 80 ? 'healthy' : score >= 60 ? 'fair' : score >= 40 ? 'degraded' : 'critical';
}

const STABLECOIN_SYMBOLS = new Set(STABLECOINS.map((coin) => coin.symbol));
const WRAPPED_ASSET_SYMBOLS = new Set(WRAPPED_ASSETS.map((asset) => asset.symbol));

/** Preserve the internal route's selected reads and the other callers' all-snapshot cache. */
export async function fetchLiveAssetDeviations(
  symbols: string[],
  mode: 'selected' | 'all' = 'all',
  onError?: (error: unknown) => void
): Promise<Record<string, number>> {
  const deviations: Record<string, number> = {};
  if (symbols.length === 0) return deviations;

  const wanted = new Set(symbols);
  let stablecoins: StablecoinDepegSnapshot[] = [];
  let wrapped: WrappedAssetSnapshot[] = [];

  if (mode === 'selected') {
    const [stablecoinResults, wrappedResults] = await Promise.all([
      Promise.allSettled(
        symbols
          .filter((symbol) => STABLECOIN_SYMBOLS.has(symbol as StablecoinSymbol))
          .map((symbol) => calculateStablecoinDepegSnapshot(symbol as StablecoinSymbol))
      ),
      Promise.allSettled(
        symbols
          .filter((symbol) => WRAPPED_ASSET_SYMBOLS.has(symbol))
          .map((symbol) => calculateWrappedAssetSnapshot(symbol))
      ),
    ]);
    stablecoins = stablecoinResults.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    );
    wrapped = wrappedResults.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    );
  } else {
    const [stablecoinResult, wrappedResult] = await Promise.allSettled([
      calculateAllStablecoinSnapshots(),
      calculateAllWrappedAssetSnapshots(),
    ]);
    if (stablecoinResult.status === 'fulfilled') stablecoins = stablecoinResult.value;
    else onError?.(stablecoinResult.reason);
    if (wrappedResult.status === 'fulfilled') wrapped = wrappedResult.value;
    else onError?.(wrappedResult.reason);
  }

  for (const snapshot of stablecoins) {
    if (wanted.has(snapshot.symbol) && Math.abs(snapshot.maxDeviationPercent) > 0) {
      deviations[snapshot.symbol] = snapshot.maxDeviationPercent;
    }
  }
  for (const snapshot of wrapped) {
    if (wanted.has(snapshot.symbol) && Math.abs(snapshot.deviationPercent) > 0) {
      deviations[snapshot.symbol] = snapshot.deviationPercent;
    }
  }
  return deviations;
}
