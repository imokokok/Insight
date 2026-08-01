import {
  calculatePositionCriticalDeviation,
  type PositionInput,
} from '@/lib/protocols/protocolHealth';
import { PROTOCOL_REGISTRY, type ProtocolConfig } from '@/lib/protocols/protocolRegistry';
import { createLogger } from '@/lib/utils/logger';
import { WRAPPED_ASSETS } from '@/lib/wrapped-assets/config';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

import { getDepegRiskLevel, getSeverity, getWrappedPegRiskLevel, scoreProvider } from './helpers';

import type {
  AssetDailyStats,
  CoverageCell,
  DailyReportData,
  DailyReportMetrics,
  DeviationEvent,
  FailureBreakdown,
  PreviousDayComparison,
  ProtocolLiquidationRisk,
  ProviderRanking,
  RiskImpact,
  RiskImpactCategory,
  StablecoinDepegSummary,
  SnapshotRow,
  WrappedAssetPegSummary,
} from './types';

const logger = createLogger('ReportService');

export function calculateMetrics(snapshots: SnapshotRow[]): DailyReportMetrics {
  const total = snapshots.length;
  const successful = snapshots.filter((s) => s.is_success).length;
  const failed = total - successful;

  const successfulSnapshots = snapshots.filter(
    (s) => s.is_success && typeof s.deviation_pct === 'number'
  );

  const deviations = successfulSnapshots
    .map((s) => Math.abs(s.deviation_pct ?? 0))
    .filter((d) => Number.isFinite(d));

  const avgDeviation =
    deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;

  const maxDeviation = deviations.length > 0 ? Math.max(...deviations) : 0;

  const latencies = successfulSnapshots
    .map((s) => s.latency_ms)
    .filter((l): l is number => l !== null && l > 0);

  const avgLatency =
    latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

  const activeProviders = new Set(snapshots.map((s) => s.provider)).size;
  const activeAssets = new Set(snapshots.map((s) => s.symbol)).size;
  const activeHours = new Set(snapshots.map((s) => s.snapshot_hour.slice(0, 13))).size;

  const anomalies = extractDeviationEvents(snapshots);
  const criticalEvents = anomalies.filter((a) => a.severity === 'critical').length;
  const highEvents = anomalies.filter((a) => a.severity === 'high').length;

  return {
    totalSnapshots: total,
    successfulSnapshots: successful,
    failedSnapshots: failed,
    overallSuccessRate: total > 0 ? Number(((successful / total) * 100).toFixed(2)) : 0,
    avgDeviationPct: Number(avgDeviation.toFixed(4)),
    maxDeviationPct: Number(maxDeviation.toFixed(4)),
    totalAnomalies: anomalies.length,
    criticalEvents,
    highEvents,
    avgLatencyMs: avgLatency,
    activeProviders,
    activeAssets,
    activeHours,
  };
}

export function calculateAssetStats(snapshots: SnapshotRow[]): AssetDailyStats[] {
  const bySymbol = new Map<string, SnapshotRow[]>();

  for (const s of snapshots) {
    if (!s.is_success) continue;
    const list = bySymbol.get(s.symbol) ?? [];
    list.push(s);
    bySymbol.set(s.symbol, list);
  }

  const stats: AssetDailyStats[] = [];

  for (const [symbol, rows] of bySymbol) {
    const prices = rows.map((r) => r.price).filter((p) => p > 0);
    const consensusPrices = rows
      .map((r) => r.consensus_price)
      .filter((p): p is number => p !== null && p > 0);
    const deviations = rows
      .map((r) => (r.deviation_pct != null ? Math.abs(r.deviation_pct) : null))
      .filter((d): d is number => d !== null && Number.isFinite(d));

    if (prices.length === 0) continue;

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const avgConsensusPrice =
      consensusPrices.length > 0
        ? consensusPrices.reduce((a, b) => a + b, 0) / consensusPrices.length
        : avgPrice;
    const maxDeviation = deviations.length > 0 ? Math.max(...deviations) : 0;
    const avgDeviation =
      deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;
    const volatilityPct =
      avgConsensusPrice > 0 ? ((maxPrice - minPrice) / avgConsensusPrice) * 100 : 0;

    stats.push({
      symbol,
      minPrice: Number(minPrice.toFixed(8)),
      maxPrice: Number(maxPrice.toFixed(8)),
      avgPrice: Number(avgPrice.toFixed(8)),
      avgConsensusPrice: Number(avgConsensusPrice.toFixed(8)),
      maxDeviationPct: Number(maxDeviation.toFixed(4)),
      avgDeviationPct: Number(avgDeviation.toFixed(4)),
      volatilityPct: Number(volatilityPct.toFixed(4)),
      sampleCount: rows.length,
    });
  }

  return stats.sort((a, b) => b.volatilityPct - a.volatilityPct);
}

export function calculateProviderRankings(snapshots: SnapshotRow[]): ProviderRanking[] {
  const byProvider = new Map<string, SnapshotRow[]>();

  for (const s of snapshots) {
    const list = byProvider.get(s.provider) ?? [];
    list.push(s);
    byProvider.set(s.provider, list);
  }

  const rankings: ProviderRanking[] = [];

  for (const [provider, rows] of byProvider) {
    const total = rows.length;
    const successful = rows.filter((r) => r.is_success);
    const successRate = total > 0 ? (successful.length / total) * 100 : 0;

    const latencies = successful
      .map((r) => r.latency_ms)
      .filter((l): l is number => l !== null && l > 0);
    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;

    const deviations = successful
      .map((r) => (r.deviation_pct != null ? Math.abs(r.deviation_pct) : null))
      .filter((d): d is number => d !== null && Number.isFinite(d));
    const avgDeviation =
      deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;
    const maxDeviation = deviations.length > 0 ? Math.max(...deviations) : 0;

    const anomalies = deviations.filter((d) => d >= 0.5).length;

    const ranking = {
      provider: provider as OracleProvider,
      totalQueries: total,
      successQueries: successful.length,
      successRate: Number(successRate.toFixed(2)),
      avgLatencyMs: avgLatency,
      avgDeviationPct: Number(avgDeviation.toFixed(4)),
      maxDeviationPct: Number(maxDeviation.toFixed(4)),
      anomalyCount: anomalies,
      score: 0,
    };

    rankings.push({ ...ranking, score: scoreProvider(ranking) });
  }

  return rankings.sort((a, b) => b.score - a.score);
}

export function extractDeviationEvents(snapshots: SnapshotRow[]): DeviationEvent[] {
  const events: DeviationEvent[] = [];

  for (const s of snapshots) {
    if (!s.is_success || s.deviation_pct == null || s.consensus_price == null) continue;
    const absDev = Math.abs(s.deviation_pct);
    if (absDev < 0.5) continue;

    events.push({
      provider: s.provider as OracleProvider,
      symbol: s.symbol,
      hour: s.snapshot_hour,
      price: s.price,
      consensusPrice: s.consensus_price,
      deviationPct: Number(s.deviation_pct.toFixed(4)),
      severity: getSeverity(s.deviation_pct),
    });
  }

  return events.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));
}

export function calculateAnomalySummary(
  _snapshots: SnapshotRow[],
  deviationEvents: DeviationEvent[]
): DailyReportData['anomalySummary'] {
  const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const byProvider: Record<string, number> = {};
  const byAsset: Record<string, number> = {};

  for (const e of deviationEvents) {
    bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
    byProvider[e.provider] = (byProvider[e.provider] ?? 0) + 1;
    byAsset[e.symbol] = (byAsset[e.symbol] ?? 0) + 1;
  }

  return {
    total: deviationEvents.length,
    bySeverity: bySeverity as DailyReportData['anomalySummary']['bySeverity'],
    byProvider,
    byAsset,
  };
}

export function calculateCoverageMatrix(snapshots: SnapshotRow[]): CoverageCell[] {
  const grouped = new Map<string, SnapshotRow[]>();

  for (const s of snapshots) {
    const key = `${s.provider}:${s.symbol}`;
    const list = grouped.get(key) ?? [];
    list.push(s);
    grouped.set(key, list);
  }

  const cells: CoverageCell[] = [];
  for (const [, rows] of grouped) {
    const total = rows.length;
    const success = rows.filter((r) => r.is_success).length;
    const failed = total - success;
    const deviations = rows
      .filter((r) => r.is_success && r.deviation_pct != null)
      .map((r) => Math.abs(r.deviation_pct!));
    const avgDeviation =
      deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;
    const maxDeviation = deviations.length > 0 ? Math.max(...deviations) : 0;

    cells.push({
      provider: rows[0].provider as OracleProvider,
      symbol: rows[0].symbol,
      total,
      success,
      failed,
      avgDeviationPct: Number(avgDeviation.toFixed(4)),
      maxDeviationPct: Number(maxDeviation.toFixed(4)),
    });
  }

  return cells.sort(
    (a, b) => a.provider.localeCompare(b.provider) || a.symbol.localeCompare(b.symbol)
  );
}

export function calculateFailureBreakdown(snapshots: SnapshotRow[]): FailureBreakdown[] {
  const grouped = new Map<string, SnapshotRow[]>();

  for (const s of snapshots) {
    if (s.is_success) continue;
    const key = `${s.provider}:${s.symbol}`;
    const list = grouped.get(key) ?? [];
    list.push(s);
    grouped.set(key, list);
  }

  const breakdown: FailureBreakdown[] = [];
  for (const [, rows] of grouped) {
    const errors = rows.map((r) => r.error_message).filter((e): e is string => !!e);
    const topError =
      errors.length > 0
        ? Object.entries(
            errors.reduce<Record<string, number>>((acc, e) => {
              acc[e] = (acc[e] ?? 0) + 1;
              return acc;
            }, {})
          ).sort((a, b) => b[1] - a[1])[0][0]
        : undefined;

    breakdown.push({
      provider: rows[0].provider as OracleProvider,
      symbol: rows[0].symbol,
      failureCount: rows.length,
      topError,
    });
  }

  return breakdown.sort((a, b) => b.failureCount - a.failureCount);
}

export function generateRiskImpacts(
  deviationEvents: DeviationEvent[],
  failureBreakdown: FailureBreakdown[],
  providerRankings: ProviderRanking[],
  topAssets: AssetDailyStats[]
): RiskImpact[] {
  const impacts: RiskImpact[] = [];
  const addedKeys = new Set<string>();

  const stablecoins = new Set(['USDC', 'USDT', 'DAI']);
  const wrappedAssets = new Set([
    'WBTC',
    'WETH',
    'wstETH',
    'stETH',
    'cbETH',
    'BTCB',
    'BTC.b',
    'USDt',
    'iSUPRA',
    'CBBTC',
    'TBTC',
  ]);

  const findProtocolsUsingAsset = (symbol: string): ProtocolConfig[] => {
    return PROTOCOL_REGISTRY.filter((p) =>
      p.assets.some((a) => a.symbol === symbol || a.priceSymbol === symbol)
    );
  };

  // 1. Deviation events → liquidation / depeg / wrapped asset impacts
  for (const event of deviationEvents) {
    const absDev = Math.abs(event.deviationPct);
    if (absDev < 0.5) continue;

    const protocols = findProtocolsUsingAsset(event.symbol);
    const affectedProtocolNames = protocols.map((p) => `${p.name} (${p.chain})`);

    const baseKey = `dev-${event.symbol}-${event.severity}`;
    if (addedKeys.has(baseKey)) continue;

    if (stablecoins.has(event.symbol)) {
      const key = `depeg-${event.symbol}`;
      if (!addedKeys.has(key)) {
        addedKeys.add(key);
        addedKeys.add(baseKey);
        impacts.push({
          category: 'stablecoin_depeg',
          severity: event.severity,
          title: `${event.symbol} oracle deviation detected`,
          affectedEntities:
            affectedProtocolNames.length > 0
              ? affectedProtocolNames
              : ['Stablecoin lenders, borrowers, and DEX LPs'],
          description: `${event.provider} quoted ${event.symbol} ${event.deviationPct > 0 ? '+' : ''}${event.deviationPct.toFixed(3)}% away from consensus. If this reflects a real depeg rather than a feed glitch, borrowers using ${event.symbol} as collateral may face liquidation, while lenders and AMM LPs could suffer impermanent loss or bad debt.`,
          relatedAssets: [event.symbol],
          relatedProviders: [event.provider],
        });
      }
      continue;
    }

    if (wrappedAssets.has(event.symbol)) {
      const key = `wrapped-${event.symbol}`;
      if (!addedKeys.has(key)) {
        addedKeys.add(key);
        addedKeys.add(baseKey);
        impacts.push({
          category: 'wrapped_asset',
          severity: event.severity,
          title: `${event.symbol} peg divergence`,
          affectedEntities:
            affectedProtocolNames.length > 0
              ? affectedProtocolNames
              : ['Users holding or using wrapped assets as collateral'],
          description: `${event.symbol} diverged ${absDev.toFixed(3)}% from its underlying reference. Protocols valuing ${event.symbol} 1:1 with the native asset may misprice collateral, exposing borrowers to unexpected liquidation and lenders to under-collateralized debt.`,
          relatedAssets: [event.symbol],
          relatedProviders: [event.provider],
        });
      }
      continue;
    }

    // Major / alt collateral assets → liquidation risk
    if (affectedProtocolNames.length > 0 && !addedKeys.has(`liq-${event.symbol}`)) {
      addedKeys.add(`liq-${event.symbol}`);
      addedKeys.add(baseKey);
      impacts.push({
        category: 'liquidation',
        severity: event.severity,
        title: `${event.symbol} price-feed divergence raises liquidation risk`,
        affectedEntities: affectedProtocolNames,
        description: `${event.provider} reported ${event.symbol} ${event.deviationPct > 0 ? '+' : ''}${event.deviationPct.toFixed(3)}% vs consensus. In ${affectedProtocolNames.slice(0, 3).join(', ')} this feed divergence can push leveraged positions toward liquidation if the oracle used by the protocol tracks the outlier price.`,
        relatedAssets: [event.symbol],
        relatedProviders: [event.provider],
      });
    }
  }

  // 2. Failure breakdown → oracle reliability impacts
  for (const failure of failureBreakdown.slice(0, 3)) {
    const protocols = findProtocolsUsingAsset(failure.symbol).filter(
      (p) => p.assets.find((a) => a.symbol === failure.symbol)?.oracleProvider === failure.provider
    );
    const key = `fail-${failure.provider}-${failure.symbol}`;
    if (addedKeys.has(key)) continue;
    addedKeys.add(key);

    impacts.push({
      category: 'oracle_reliability',
      severity: failure.failureCount >= 6 ? 'high' : failure.failureCount >= 3 ? 'medium' : 'low',
      title: `${failure.provider} feed failures on ${failure.symbol}`,
      affectedEntities:
        protocols.length > 0
          ? protocols.map((p) => `${p.name} (${p.chain})`)
          : [`Users relying on ${failure.provider} for ${failure.symbol}/USD pricing`],
      description: `${failure.provider} failed ${failure.failureCount} snapshot(s) for ${failure.symbol}${failure.topError ? ` (${failure.topError})` : ''}. Any protocol using this feed as its primary oracle may stall liquidations, misprice collateral, or temporarily freeze borrowing.`,
      relatedAssets: [failure.symbol],
      relatedProviders: [failure.provider],
    });
  }

  // 3. Provider ranking → systemic risk impacts
  if (providerRankings.length > 1) {
    const worst = providerRankings[providerRankings.length - 1];
    if (worst && (worst.successRate < 95 || worst.avgDeviationPct >= 0.5)) {
      // Find protocols that depend on the worst provider for any tracked asset
      const affectedProtocols = PROTOCOL_REGISTRY.filter((p) =>
        p.assets.some((a) => a.oracleProvider === worst.provider)
      );
      const key = `systemic-${worst.provider}`;
      if (!addedKeys.has(key)) {
        addedKeys.add(key);
        impacts.push({
          category: 'systemic',
          severity: worst.avgDeviationPct >= 1 || worst.successRate < 90 ? 'critical' : 'high',
          title: `${worst.provider} underperformed the consensus network`,
          affectedEntities:
            affectedProtocols.length > 0
              ? affectedProtocols.map((p) => `${p.name} (${p.chain})`)
              : ['DeFi protocols using this oracle as a primary or fallback price source'],
          description: `${worst.provider} delivered only ${worst.successRate.toFixed(1)}% successful snapshots with ${worst.avgDeviationPct.toFixed(3)}% average deviation. Protocols that use ${worst.provider} as a primary feed face higher stale-price and incorrect-liquidation risk today.`,
          relatedAssets: [],
          relatedProviders: [worst.provider],
        });
      }
    }
  }

  // 4. Top volatile asset → broad liquidation risk
  if (topAssets.length > 0) {
    const mostVolatile = topAssets[0];
    if (mostVolatile.volatilityPct > 5) {
      const protocols = findProtocolsUsingAsset(mostVolatile.symbol);
      const key = `vol-${mostVolatile.symbol}`;
      if (!addedKeys.has(key) && protocols.length > 0) {
        addedKeys.add(key);
        impacts.push({
          category: 'liquidation',
          severity: mostVolatile.volatilityPct > 10 ? 'critical' : 'high',
          title: `${mostVolatile.symbol} intraday volatility stressed leveraged positions`,
          affectedEntities: protocols.map((p) => `${p.name} (${p.chain})`),
          description: `${mostVolatile.symbol} swung ${mostVolatile.volatilityPct.toFixed(2)}% between min and max consensus prices today. High spot volatility combined with oracle deviation can trigger cascading liquidations in lending markets before users have time to add collateral.`,
          relatedAssets: [mostVolatile.symbol],
          relatedProviders: [],
        });
      }
    }
  }

  return impacts
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, 8);
}

function buildSnapshotPriceFetcher(snapshots: SnapshotRow[]) {
  const byProviderSymbol = new Map<string, SnapshotRow[]>();
  const bySymbol = new Map<string, SnapshotRow[]>();

  for (const s of snapshots) {
    if (!s.is_success || s.price <= 0) continue;
    const key = `${s.provider}:${s.symbol}`;
    const list1 = byProviderSymbol.get(key) ?? [];
    list1.push(s);
    byProviderSymbol.set(key, list1);

    const list2 = bySymbol.get(s.symbol) ?? [];
    list2.push(s);
    bySymbol.set(s.symbol, list2);
  }

  for (const list of byProviderSymbol.values()) {
    list.sort((a, b) => b.snapshot_hour.localeCompare(a.snapshot_hour));
  }
  for (const list of bySymbol.values()) {
    list.sort((a, b) => b.snapshot_hour.localeCompare(a.snapshot_hour));
  }

  return async (queries: { provider: OracleProvider; symbol: string; chain?: Blockchain }[]) => {
    return queries.map((query) => {
      const key = `${query.provider}:${query.symbol}`;
      const exactMatches = byProviderSymbol.get(key);
      const exact = exactMatches?.[0];
      if (exact) {
        return {
          provider: query.provider,
          symbol: query.symbol,
          price: exact.price,
          timestamp: new Date(exact.snapshot_hour).getTime(),
        };
      }

      const symbolMatches = bySymbol.get(query.symbol);
      const fallback = symbolMatches?.[0];
      if (fallback) {
        return {
          provider: query.provider,
          symbol: query.symbol,
          price: fallback.consensus_price ?? fallback.price,
          timestamp: new Date(fallback.snapshot_hour).getTime(),
        };
      }

      throw new Error(`No snapshot price found for ${query.provider}/${query.symbol}`);
    });
  };
}

function findProtocolNamesUsingAsset(symbol: string): string[] {
  return PROTOCOL_REGISTRY.filter((p) =>
    p.assets.some((a) => a.symbol === symbol || a.priceSymbol === symbol)
  )
    .map((p) => `${p.name} (${p.chain})`)
    .sort();
}

export function calculateStablecoinDepegSummary(
  snapshots: SnapshotRow[]
): StablecoinDepegSummary[] {
  const stablecoins = ['USDC', 'USDT', 'DAI'];
  const bySymbol = new Map<string, number>();

  for (const s of snapshots) {
    if (!s.is_success || s.deviation_pct == null) continue;
    if (!stablecoins.includes(s.symbol)) continue;
    const current = bySymbol.get(s.symbol) ?? 0;
    bySymbol.set(s.symbol, Math.max(current, Math.abs(s.deviation_pct)));
  }

  return Array.from(bySymbol.entries())
    .map(([symbol, maxDeviation]) => ({
      symbol,
      maxDeviationPercent: Number(maxDeviation.toFixed(4)),
      riskLevel: getDepegRiskLevel(maxDeviation),
      affectedProtocols: findProtocolNamesUsingAsset(symbol),
    }))
    .filter((s) => s.riskLevel !== 'normal')
    .sort((a, b) => b.maxDeviationPercent - a.maxDeviationPercent);
}

export function calculateWrappedAssetPegSummary(
  snapshots: SnapshotRow[]
): WrappedAssetPegSummary[] {
  const wrappedAssets = WRAPPED_ASSETS.map((a) => a.symbol.toUpperCase());
  const bySymbol = new Map<string, number>();

  for (const s of snapshots) {
    if (!s.is_success || s.deviation_pct == null) continue;
    if (!wrappedAssets.includes(s.symbol.toUpperCase())) continue;
    const current = bySymbol.get(s.symbol.toUpperCase()) ?? 0;
    bySymbol.set(s.symbol.toUpperCase(), Math.max(current, Math.abs(s.deviation_pct)));
  }

  return Array.from(bySymbol.entries())
    .map(([symbol, maxDeviation]) => ({
      symbol,
      maxDeviationPercent: Number(maxDeviation.toFixed(4)),
      riskLevel: getWrappedPegRiskLevel(maxDeviation),
      affectedProtocols: findProtocolNamesUsingAsset(symbol),
    }))
    .filter((s) => s.riskLevel !== 'normal')
    .sort((a, b) => b.maxDeviationPercent - a.maxDeviationPercent);
}

export async function calculateProtocolLiquidationRisks(
  snapshots: SnapshotRow[]
): Promise<ProtocolLiquidationRisk[]> {
  if (snapshots.length === 0) return [];

  const fetchPrices = buildSnapshotPriceFetcher(snapshots);
  const risks: ProtocolLiquidationRisk[] = [];

  for (const protocol of PROTOCOL_REGISTRY) {
    if (!protocol.defaultPosition) continue;

    const input: PositionInput = {
      protocolId: protocol.id,
      collaterals: protocol.defaultPosition.collaterals,
      borrows: protocol.defaultPosition.borrows,
    };

    try {
      const result = await calculatePositionCriticalDeviation(input, fetchPrices, []);
      const worstSingle =
        result.assetDeviations.length > 0
          ? result.assetDeviations.reduce((worst, curr) =>
              Math.abs(curr.criticalDeviationPercent) < Math.abs(worst.criticalDeviationPercent)
                ? curr
                : worst
            )
          : null;

      risks.push({
        protocolId: protocol.id,
        protocolName: protocol.name,
        chain: protocol.chain,
        collaterals: result.collaterals.map((c) => ({
          symbol: c.symbol,
          amount: c.amount,
          price: c.price,
          value: c.value,
        })),
        borrows: result.borrows.map((b) => ({
          symbol: b.symbol,
          amount: b.amount,
          price: b.price,
          value: b.value,
        })),
        totalCollateralValue: result.totalCollateralValue,
        totalBorrowValue: result.totalBorrowValue,
        currentHealthFactor: result.currentHealthFactor,
        currentCollateralRatio: result.currentCollateralRatio,
        liquidationThreshold: result.liquidationThreshold,
        jointCriticalDeviationPercent: result.jointDeviation.criticalDeviationPercent,
        worstSingleAssetDeviation: worstSingle
          ? {
              symbol: worstSingle.symbol,
              criticalDeviationPercent: worstSingle.criticalDeviationPercent,
              direction: worstSingle.direction,
            }
          : null,
        scenarios: result.deviationScenarios.map((s) => ({
          label: s.label,
          deviationPercent: s.deviationPercent,
          isJoint: s.isJoint,
          healthFactor: s.healthFactor,
          collateralRatio: s.collateralRatio,
          status: s.status,
          distanceToLiquidationPercent: s.distanceToLiquidationPercent,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to calculate liquidation risk for ${protocol.id}: ${message}`);
    }
  }

  return risks.sort((a, b) => a.currentHealthFactor - b.currentHealthFactor);
}

export function generateRecommendations(
  metrics: DailyReportMetrics,
  providerRankings: ProviderRanking[],
  deviationEvents: DeviationEvent[],
  riskImpacts: RiskImpact[],
  protocolLiquidationRisks: ProtocolLiquidationRisk[],
  stablecoinDepeg: StablecoinDepegSummary[],
  wrappedAssetPeg: WrappedAssetPegSummary[]
): string[] {
  const takeaways: string[] = [];

  // 1. Highest priority: user-facing risk impacts.
  const criticalImpacts = riskImpacts.filter((i) => i.severity === 'critical');
  const highImpacts = riskImpacts.filter((i) => i.severity === 'high');
  if (criticalImpacts.length > 0 || highImpacts.length > 0) {
    const total = criticalImpacts.length + highImpacts.length;
    const severityParts: string[] = [];
    if (criticalImpacts.length > 0) severityParts.push(`${criticalImpacts.length} critical`);
    if (highImpacts.length > 0) severityParts.push(`${highImpacts.length} high-severity`);
    takeaways.push(
      `Today's data shows ${severityParts.join(' and ')} risk impact${total > 1 ? 's' : ''}. Review affected protocols and consider protective action.`
    );
  }

  // 2. Liquidation stress-test signal.
  if (takeaways.length < 3 && protocolLiquidationRisks.length > 0) {
    const riskiest = protocolLiquidationRisks[0];
    const criticalScenario = riskiest.scenarios.find((s) => s.isJoint && s.status === 'liquidated');
    if (criticalScenario) {
      takeaways.push(
        `${riskiest.protocolName} (${riskiest.chain}) is the most leveraged-sensitive protocol today: a ${criticalScenario.label} joint oracle deviation would liquidate the benchmark position.`
      );
    } else {
      const smallestBuffer = riskiest.scenarios
        .filter((s) => s.isJoint)
        .sort((a, b) => a.healthFactor - b.healthFactor)[0];
      if (smallestBuffer) {
        takeaways.push(
          `${riskiest.protocolName} (${riskiest.chain}) has the smallest liquidation buffer. Under the ${smallestBuffer.label} joint-deviation scenario, Health Factor drops to ${smallestBuffer.healthFactor.toFixed(2)}.`
        );
      }
    }
  }

  // 3. Stablecoin / wrapped-asset peg signals.
  if (takeaways.length < 3 && (stablecoinDepeg.length > 0 || wrappedAssetPeg.length > 0)) {
    const allPeg = [...stablecoinDepeg, ...wrappedAssetPeg].sort(
      (a, b) => b.maxDeviationPercent - a.maxDeviationPercent
    );
    const top = allPeg[0];
    const isStablecoin = stablecoinDepeg.some((s) => s.symbol === top.symbol);
    takeaways.push(
      `${top.symbol} recorded the largest ${isStablecoin ? 'stablecoin depeg' : 'wrapped-asset peg'} signal today at ${top.maxDeviationPercent.toFixed(2)}% (${top.riskLevel} level).`
    );
  }

  // 4. Deviation event signal.
  if (takeaways.length < 3) {
    if (metrics.criticalEvents > 0) {
      takeaways.push(
        `${metrics.criticalEvents} critical deviation event(s) (≥2%) occurred today. Audit affected feeds before using them as primary references.`
      );
    } else if (metrics.highEvents > 0) {
      takeaways.push(
        `${metrics.highEvents} high deviation event(s) (1-2%) occurred today. Track the affected provider/asset pairs closely.`
      );
    } else if (deviationEvents.length > 0) {
      takeaways.push(
        `${deviationEvents.length} material deviation event(s) were recorded today. Review whether the affected feeds remain within your tolerance.`
      );
    }
  }

  // 5. Provider health signal.
  if (takeaways.length < 3) {
    const worstProvider = providerRankings[providerRankings.length - 1];
    if (worstProvider && (worstProvider.successRate < 95 || worstProvider.avgDeviationPct >= 0.5)) {
      takeaways.push(
        `${worstProvider.provider} underperformed with a ${worstProvider.successRate.toFixed(1)}% success rate and ${worstProvider.avgDeviationPct.toFixed(3)}% average deviation.`
      );
    } else if (worstProvider && worstProvider.avgLatencyMs > 2000) {
      takeaways.push(
        `${worstProvider.provider} showed the highest average latency (${worstProvider.avgLatencyMs} ms), which may introduce stale-price risk.`
      );
    }
  }

  // Fallback: ensure at least one takeaway is always shown.
  if (takeaways.length === 0) {
    if (metrics.overallSuccessRate >= 95) {
      takeaways.push(
        'All tracked providers stayed close to consensus with high uptime. Today looks stable.'
      );
    } else {
      takeaways.push(
        `Overall metrics are stable (${metrics.overallSuccessRate.toFixed(1)}% success rate, ${metrics.avgDeviationPct.toFixed(3)}% avg deviation), but keep tracking for emerging drift.`
      );
    }
  }

  return takeaways.slice(0, 3);
}

export function generateSummary(
  dateStr: string,
  metrics: DailyReportMetrics,
  deviationEvents: DeviationEvent[],
  previousDayComparison: PreviousDayComparison,
  riskImpacts: RiskImpact[],
  protocolLiquidationRisks: ProtocolLiquidationRisk[],
  stablecoinDepeg: StablecoinDepegSummary[],
  wrappedAssetPeg: WrappedAssetPegSummary[]
): string {
  const dateLabel = new Date(dateStr).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const parts: string[] = [
    `On ${dateLabel}, Insight tracked ${metrics.activeAssets} assets across ${metrics.activeProviders} oracle providers, capturing ${metrics.totalSnapshots} price snapshots over ${metrics.activeHours} active hourly window${metrics.activeHours > 1 ? 's' : ''}.`,
  ];

  if (riskImpacts.length > 0) {
    const categories = new Set(riskImpacts.map((i) => i.category));
    const categoryLabels: Record<RiskImpactCategory, string> = {
      liquidation: 'liquidation risk',
      stablecoin_depeg: 'stablecoin depeg signals',
      wrapped_asset: 'wrapped-asset peg risk',
      oracle_reliability: 'oracle reliability issues',
      systemic: 'systemic oracle dependency risk',
    };
    const labels = Array.from(categories).map((c) => categoryLabels[c]);
    const criticalCount = riskImpacts.filter((i) => i.severity === 'critical').length;
    const highCount = riskImpacts.filter((i) => i.severity === 'high').length;
    parts.push(
      `From a user-risk perspective, today's data translates into ${labels.join(', ')}: ${riskImpacts.length} impact${riskImpacts.length > 1 ? 's' : ''} identified${criticalCount > 0 ? `, including ${criticalCount} critical` : ''}${highCount > 0 && criticalCount === 0 ? `, including ${highCount} high-severity` : ''}.`
    );
  }

  const pegAssets = [...stablecoinDepeg, ...wrappedAssetPeg];
  if (pegAssets.length > 0) {
    const topPeg = pegAssets.sort((a, b) => b.maxDeviationPercent - a.maxDeviationPercent)[0];
    const stableCount = stablecoinDepeg.length;
    const wrappedCount = wrappedAssetPeg.length;
    const parts2: string[] = [];
    if (stableCount > 0) parts2.push(`${stableCount} stablecoin${stableCount > 1 ? 's' : ''}`);
    if (wrappedCount > 0)
      parts2.push(`${wrappedCount} wrapped/LST asset${wrappedCount > 1 ? 's' : ''}`);
    parts.push(
      `Peg tracking flagged ${parts2.join(' and ')}: ${topPeg.symbol} recorded the largest divergence at ${topPeg.maxDeviationPercent.toFixed(2)}%.`
    );
  }

  if (protocolLiquidationRisks.length > 0) {
    const riskiest = protocolLiquidationRisks[0];
    const jointPct = Math.abs(riskiest.jointCriticalDeviationPercent);
    parts.push(
      `Stress-testing representative positions across integrated lending protocols shows ${riskiest.protocolName} (${riskiest.chain}) is closest to liquidation: a joint oracle deviation of ${jointPct.toFixed(2)}% (major-equiv) would push its benchmark position below the liquidation threshold.`
    );
  }

  if (metrics.overallSuccessRate >= 99) {
    parts.push(
      `Data collection was highly reliable with a ${metrics.overallSuccessRate.toFixed(1)}% success rate.`
    );
  } else if (metrics.overallSuccessRate >= 95) {
    parts.push(
      `Data collection was stable with a ${metrics.overallSuccessRate.toFixed(1)}% success rate.`
    );
  } else {
    parts.push(
      `Data collection experienced some instability, achieving a ${metrics.overallSuccessRate.toFixed(1)}% success rate with ${metrics.failedSnapshots} failed snapshots.`
    );
  }

  if (previousDayComparison.reportAvailable) {
    const srChange = previousDayComparison.successRateChangePct;
    const devChange = previousDayComparison.avgDeviationChangePct;
    const changeParts: string[] = [];
    if (srChange !== 0) {
      changeParts.push(
        `success rate ${srChange > 0 ? 'improved' : 'declined'} by ${Math.abs(srChange).toFixed(1)} percentage points`
      );
    }
    if (devChange !== 0) {
      changeParts.push(
        `average deviation ${devChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(devChange).toFixed(3)} percentage points`
      );
    }
    if (changeParts.length > 0) {
      parts.push(`Compared to the previous day, ${changeParts.join(' and ')}.`);
    }
  }

  if (deviationEvents.length > 0) {
    parts.push(
      `Cross-oracle deviation analysis flagged ${deviationEvents.length} material event${deviationEvents.length > 1 ? 's' : ''}, indicating some feed divergence from consensus.`
    );
  } else {
    parts.push(
      'Cross-oracle deviation analysis found all providers closely aligned with consensus, with no material divergence events.'
    );
  }

  return parts.join(' ');
}
