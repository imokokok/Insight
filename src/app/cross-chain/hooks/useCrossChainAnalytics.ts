import { useMemo, useRef, useCallback, useState, useEffect } from 'react';

import {
  calculateDivergenceSignals,
  type DivergenceSignalResult,
  type DivergenceTimeSeries,
  type OracleLeadership,
  type DivergencePair,
} from '@/lib/analytics/divergenceSignals';
import {
  calculateFeedBehavior,
  type FeedBehaviorResult,
  type UpdateRhythmMetrics,
  type ConfidenceIntervalMetrics,
  type HeartbeatMetrics,
  type FeedHealthScore,
  type FeedHealthLevel,
} from '@/lib/analytics/feedBehavior';
import {
  calculateRiskMetrics,
  getRiskLevelColor,
  type RiskLevel,
  type RiskWeights,
  DEFAULT_RISK_WEIGHTS,
} from '@/lib/analytics/riskMetrics';
import { calculateStability } from '@/lib/analytics/stabilityScore';
import { chainColors } from '@/lib/constants';
import { createLogger } from '@/lib/utils/logger';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { CHAIN_EXPECTED_INTERVALS } from '../constants';

interface ChainPriceHistoryEntry {
  price: number;
  timestamp: number;
  success: boolean;
  confidence?: number;
  confidenceInterval?: { bid: number; ask: number; widthPercentage: number };
}

const MAX_HISTORY_PER_CHAIN = 200;

const logger = createLogger('useCrossChainAnalytics');

function getChainExpectedInterval(chain: string): number {
  return CHAIN_EXPECTED_INTERVALS[chain.toLowerCase()] ?? 10;
}

/**
 * Build a per-chain history map from the snapshot, falling back to a single
 * synthetic entry for chains that have a current price but no history yet.
 * The `transform`/`fallback` callbacks let each caller pick the exact entry
 * shape it needs (divergence uses a minimal subset, feed/stability carry
 * confidence/confidenceInterval).
 */
function buildHistoryMap<T>(
  historySnapshot: Map<string, ChainPriceHistoryEntry[]>,
  chainPrices: PriceData[],
  transform: (entries: ChainPriceHistoryEntry[]) => T[],
  fallback: (p: PriceData) => T
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const [chain, entries] of historySnapshot) {
    map.set(chain, transform(entries));
  }
  for (const p of chainPrices) {
    if (!map.has(p.chain!) && p.price > 0) {
      map.set(p.chain!, [fallback(p)]);
    }
  }
  return map;
}

export interface CrossChainRiskResult {
  riskLevel: RiskLevel;
  riskScore: number;
  riskColor: string;
  hhiValue: number;
  hhiLevel: RiskLevel;
  diversificationScore: number;
  diversificationLevel: RiskLevel;
  volatilityIndex: number;
  volatilityLevel: RiskLevel;
  correlationScore: number;
  correlationLevel: RiskLevel;
  highCorrelationPairs: string[];
  freshnessScore: number;
  freshnessLevel: RiskLevel;
  staleOracles: Array<{ name: string; stalenessSeconds: number }>;
  manipulationResistanceScore: number;
  manipulationResistanceLevel: RiskLevel;
  manipulationResistanceFactors: {
    dataSourceDiversity: number;
    aggregationRobustness: number;
    updateFrequency: number;
    onChainVerification: number;
  };
  sharedDependencyScore: number;
  sharedDependencyLevel: RiskLevel;
  sharedSourceGroups: Array<{ source: string; oracles: string[] }>;
  systemicRiskFactor: number;
  weights: RiskWeights;
  divergenceAccelerationScore: number;
  divergenceAccelerationLevel: RiskLevel;
  feedBehaviorHealthAvg: number;
  feedBehaviorHealthLevel: RiskLevel;
  stabilityDecayScore: number;
  stabilityDecayLevel: RiskLevel;
  riskAttribution: Array<{ dimension: string; contribution: number; suggestion: string }>;
}

export interface CrossChainDivergenceResult {
  divergenceResult: DivergenceSignalResult | null;
  timeSeries: DivergenceTimeSeries[];
  leadership: OracleLeadership[];
  divergenceMatrix: DivergencePair[][];
  acceleratingCount: number;
  directionalBiasCount: number;
  leadingOracle: string | null;
  maxAcceleration: number;
}

export interface CrossChainFeedResult {
  feedBehaviorResult: FeedBehaviorResult | null;
  rhythmMetrics: UpdateRhythmMetrics[];
  confidenceMetrics: ConfidenceIntervalMetrics[];
  heartbeatMetrics: HeartbeatMetrics[];
  healthScores: FeedHealthScore[];
  overallHealthAvg: number;
  overallHealthLevel: FeedHealthLevel;
  anomalyCount: number;
  heartbeatLostCount: number;
  confidenceSurgeCount: number;
}

interface CrossChainAnalyticsResult {
  risk: CrossChainRiskResult;
  divergence: CrossChainDivergenceResult;
  feed: CrossChainFeedResult;
  chainCount: number;
}

function getEmptyRiskResult(): CrossChainRiskResult {
  return {
    riskLevel: 'low',
    riskScore: 0,
    riskColor: getRiskLevelColor('low'),
    hhiValue: 0,
    hhiLevel: 'low',
    diversificationScore: 0,
    diversificationLevel: 'low',
    volatilityIndex: 0,
    volatilityLevel: 'low',
    correlationScore: 0,
    correlationLevel: 'low',
    highCorrelationPairs: [],
    freshnessScore: 0,
    freshnessLevel: 'low',
    staleOracles: [],
    manipulationResistanceScore: 0,
    manipulationResistanceLevel: 'low',
    manipulationResistanceFactors: {
      dataSourceDiversity: 0,
      aggregationRobustness: 0,
      updateFrequency: 0,
      onChainVerification: 0,
    },
    sharedDependencyScore: 0,
    sharedDependencyLevel: 'low',
    sharedSourceGroups: [],
    systemicRiskFactor: 0,
    weights: DEFAULT_RISK_WEIGHTS,
    divergenceAccelerationScore: 0,
    divergenceAccelerationLevel: 'low',
    feedBehaviorHealthAvg: 0,
    feedBehaviorHealthLevel: 'low',
    stabilityDecayScore: 0,
    stabilityDecayLevel: 'low',
    riskAttribution: [],
  };
}

function getEmptyDivergenceResult(): CrossChainDivergenceResult {
  return {
    divergenceResult: null,
    timeSeries: [],
    leadership: [],
    divergenceMatrix: [],
    acceleratingCount: 0,
    directionalBiasCount: 0,
    leadingOracle: null,
    maxAcceleration: 0,
  };
}

function getEmptyFeedResult(): CrossChainFeedResult {
  return {
    feedBehaviorResult: null,
    rhythmMetrics: [],
    confidenceMetrics: [],
    heartbeatMetrics: [],
    healthScores: [],
    overallHealthAvg: 0,
    overallHealthLevel: 'healthy',
    anomalyCount: 0,
    heartbeatLostCount: 0,
    confidenceSurgeCount: 0,
  };
}

function buildHistorySnapshot(
  historyRef: React.MutableRefObject<Map<string, ChainPriceHistoryEntry[]>>
): Map<string, ChainPriceHistoryEntry[]> {
  const snapshot = new Map<string, ChainPriceHistoryEntry[]>();
  for (const [chain, entries] of historyRef.current) {
    snapshot.set(chain, [...entries]);
  }
  return snapshot;
}

export function useCrossChainAnalytics(currentPrices: PriceData[]): CrossChainAnalyticsResult {
  const priceHistoryRef = useRef<Map<string, ChainPriceHistoryEntry[]>>(new Map());
  const prevPricesKeyRef = useRef<string>('');

  const [historySnapshot, setHistorySnapshot] = useState<Map<string, ChainPriceHistoryEntry[]>>(
    new Map()
  );

  const updateHistory = useCallback((prices: PriceData[]) => {
    const key = prices.map((p) => `${p.chain}-${p.price}-${p.timestamp}`).join('|');
    if (key === prevPricesKeyRef.current) return;
    prevPricesKeyRef.current = key;

    const currentChains = new Set(prices.map((p) => p.chain).filter(Boolean));
    for (const chainKey of priceHistoryRef.current.keys()) {
      if (!currentChains.has(chainKey as Blockchain)) {
        priceHistoryRef.current.delete(chainKey);
      }
    }

    for (const price of prices) {
      if (!price.chain || price.price <= 0) continue;
      const entries = priceHistoryRef.current.get(price.chain) ?? [];
      const lastEntry = entries[entries.length - 1];
      if (!lastEntry || price.timestamp > lastEntry.timestamp) {
        entries.push({
          price: price.price,
          timestamp: price.timestamp,
          success: true,
          confidence: price.confidence,
          confidenceInterval: price.confidenceInterval
            ? {
                bid: price.confidenceInterval.bid,
                ask: price.confidenceInterval.ask,
                widthPercentage: price.confidenceInterval.widthPercentage,
              }
            : undefined,
        });
        if (entries.length > MAX_HISTORY_PER_CHAIN) {
          entries.splice(0, entries.length - MAX_HISTORY_PER_CHAIN);
        }
        priceHistoryRef.current.set(price.chain, entries);
      }
    }
  }, []);

  useEffect(() => {
    updateHistory(currentPrices);
    setHistorySnapshot(buildHistorySnapshot(priceHistoryRef));
  }, [currentPrices, updateHistory]);

  return useMemo(() => {
    const chainPrices = currentPrices.filter((p) => p.chain && p.price > 0);
    if (chainPrices.length < 2) {
      return {
        risk: getEmptyRiskResult(),
        divergence: getEmptyDivergenceResult(),
        feed: getEmptyFeedResult(),
        chainCount: chainPrices.length,
      };
    }

    try {
      const chainNameList = chainPrices.map((p) => p.chain!);
      const totalChains = chainNameList.length;
      const equalShare = 100 / totalChains;

      const oracleData = chainPrices.map((p) => ({
        name: p.chain!,
        share: equalShare,
        color: (chainColors as Record<string, string>)[p.chain!] || '#888888',
        tvs: 'N/A',
        tvsValue: 0,
        chains: 1,
        protocols: 1,
        avgLatency: 0,
        accuracy: 95,
        updateFrequency: getChainExpectedInterval(p.chain!),
        change24h: p.change24h ?? 0,
        change7d: 0,
        change30d: 0,
      }));

      const priceHistoriesByProvider = new Map<string, number[]>();
      const priceHistoryTimestampsByProvider = new Map<string, number[]>();
      for (const [chain, entries] of historySnapshot) {
        const validEntries = entries.filter((e) => e.success && e.price > 0);
        const prices = validEntries.map((e) => e.price);
        const timestamps = validEntries.map((e) => e.timestamp);
        if (prices.length > 0) {
          priceHistoriesByProvider.set(chain, prices);
          priceHistoryTimestampsByProvider.set(chain, timestamps);
        }
      }
      for (const p of chainPrices) {
        if (!priceHistoriesByProvider.has(p.chain!) && p.price > 0) {
          priceHistoriesByProvider.set(p.chain!, [p.price]);
          priceHistoryTimestampsByProvider.set(p.chain!, [p.timestamp]);
        }
      }

      const oracleTimestamps = chainPrices.map((p) => ({
        name: p.chain!,
        timestamp: p.timestamp,
      }));

      const manipulationResistanceData = chainPrices.map((p) => {
        const expectedInterval = getChainExpectedInterval(p.chain!);
        return {
          name: p.chain!,
          dataSources: 3,
          updateFrequencySeconds: expectedInterval,
          hasOnChainVerification: true,
          aggregationMethod: 'median' as const,
        };
      });

      const sharedDependencyData = chainPrices.map((p) => ({
        name: p.chain!,
        primaryDataSources: [p.provider],
      }));

      const riskMetrics = calculateRiskMetrics({
        oracleData,
        priceHistoriesByProvider,
        priceHistoryTimestampsByProvider,
        oracleTimestamps,
        manipulationResistanceData,
        sharedDependencyData,
      });

      const hhiScore = Math.min((riskMetrics.hhi.value / 10000) * 100, 100);
      const divScore = 100 - riskMetrics.diversification.score;
      const volScore = riskMetrics.volatility.index;
      const corrScore = riskMetrics.correlationRisk.score;
      const freshScore = riskMetrics.freshnessRisk.score;
      const manipScore = riskMetrics.manipulationResistance.score;
      const sharedScore = riskMetrics.sharedDependency.score;

      const historyMapForDivergence = buildHistoryMap(
        historySnapshot,
        chainPrices,
        (entries) =>
          entries.map((e) => ({ price: e.price, timestamp: e.timestamp, success: e.success })),
        (p) => ({ price: p.price, timestamp: p.timestamp, success: true })
      );

      const divergencePriceData = chainPrices.map((p) => ({
        provider: p.chain!,
        price: p.price,
        timestamp: p.timestamp,
        confidence: p.confidence,
        confidenceInterval: p.confidenceInterval,
      }));

      const divergenceResult = calculateDivergenceSignals(
        divergencePriceData,
        historyMapForDivergence
      );

      const divergenceAccelScore = Math.min(
        Math.round((divergenceResult.acceleratingCount / Math.max(chainPrices.length, 1)) * 100),
        100
      );
      const divergenceAccelLevel: RiskLevel =
        divergenceAccelScore < 20
          ? 'low'
          : divergenceAccelScore < 40
            ? 'medium'
            : divergenceAccelScore < 60
              ? 'high'
              : 'critical';

      const historyMapForFeed = buildHistoryMap(
        historySnapshot,
        chainPrices,
        (entries) => [...entries],
        (p) => ({
          price: p.price,
          timestamp: p.timestamp,
          success: true,
          confidence: p.confidence,
          confidenceInterval: p.confidenceInterval,
        })
      );

      const feedPriceData = chainPrices.map((p) => ({
        provider: p.chain!,
        price: p.price,
        timestamp: p.timestamp,
        success: true,
        confidence: p.confidence,
        confidenceInterval: p.confidenceInterval,
      }));

      const feedBehaviorResult = calculateFeedBehavior(feedPriceData, historyMapForFeed);

      const feedHealthRiskScore = 100 - feedBehaviorResult.overallHealthAvg;
      const feedHealthRiskLevel: RiskLevel =
        feedHealthRiskScore < 20
          ? 'low'
          : feedHealthRiskScore < 40
            ? 'medium'
            : feedHealthRiskScore < 60
              ? 'high'
              : 'critical';

      const historyMapForStability = buildHistoryMap(
        historySnapshot,
        chainPrices,
        (entries) =>
          entries.map((e) => ({
            price: e.price,
            timestamp: e.timestamp,
            success: e.success,
            confidence: e.confidence,
          })),
        (p) => ({ price: p.price, timestamp: p.timestamp, success: true, confidence: p.confidence })
      );

      const stabilityResult = calculateStability(chainNameList, historyMapForStability);

      const stabilityDecayScore = Math.min(
        Math.round((stabilityResult.decliningCount / Math.max(chainPrices.length, 1)) * 100),
        100
      );
      const stabilityDecayLevel: RiskLevel =
        stabilityDecayScore < 20
          ? 'low'
          : stabilityDecayScore < 40
            ? 'medium'
            : stabilityDecayScore < 60
              ? 'high'
              : 'critical';

      const w = riskMetrics.overallRisk.weights;
      const totalWeight =
        w.hhi +
        w.diversification +
        w.volatility +
        w.correlation +
        w.freshness +
        w.manipulationResistance +
        w.sharedDependency;

      const overallRiskScore =
        totalWeight > 0
          ? Math.round(
              (hhiScore * w.hhi +
                divScore * w.diversification +
                volScore * w.volatility +
                corrScore * w.correlation +
                freshScore * w.freshness +
                manipScore * w.manipulationResistance +
                sharedScore * w.sharedDependency) /
                totalWeight
            )
          : 0;

      const overallRiskLevel: RiskLevel =
        overallRiskScore < 25
          ? 'low'
          : overallRiskScore < 45
            ? 'medium'
            : overallRiskScore < 65
              ? 'high'
              : 'critical';

      const topStaleChains = riskMetrics.freshnessRisk.staleOracles
        .slice(0, 3)
        .map((o) => o.name)
        .join(', ');
      const topCorrelatedChains = riskMetrics.correlationRisk.highCorrelationPairs
        .slice(0, 2)
        .join(', ');
      const topSharedProviders = riskMetrics.sharedDependency.sharedSourceGroups
        .slice(0, 2)
        .map((g) => `${g.source} → ${g.oracles.join(', ')}`)
        .join('; ');
      const manipFactorsChain = riskMetrics.manipulationResistance.factors;
      const weakestManipFactorChain = [
        { label: 'data source diversity', value: manipFactorsChain.dataSourceDiversity },
        { label: 'aggregation robustness', value: manipFactorsChain.aggregationRobustness },
        { label: 'update frequency', value: manipFactorsChain.updateFrequency },
        { label: 'on-chain verification', value: manipFactorsChain.onChainVerification },
      ].sort((a, b) => a.value - b.value)[0];

      const riskAttribution = [
        {
          dimension: 'Market Concentration (HHI)',
          contribution: hhiScore * w.hhi,
          suggestion:
            riskMetrics.hhi.level !== 'low'
              ? `Chain HHI at ${riskMetrics.hhi.value.toFixed(0)} — price data is concentrated on few chains; add ${riskMetrics.hhi.level === 'critical' ? '2-3 more' : '1-2 more'} chain sources to balance`
              : `Chain concentration is balanced (HHI ${riskMetrics.hhi.value.toFixed(0)}) — no action needed`,
        },
        {
          dimension: 'Diversification',
          contribution: divScore * w.diversification,
          suggestion:
            riskMetrics.diversification.level !== 'low'
              ? `Diversification score at ${riskMetrics.diversification.score}/100 — current chain/protocol mix lacks variety; adding chains with different oracle providers would improve resilience`
              : `Diversification is healthy (${riskMetrics.diversification.score}/100) — chain sources are well-distributed`,
        },
        {
          dimension: 'Volatility',
          contribution: volScore * w.volatility,
          suggestion:
            riskMetrics.volatility.level !== 'low'
              ? `Cross-chain volatility at ${riskMetrics.volatility.index.toFixed(1)} (${riskMetrics.volatility.level} level) — significant inter-chain price instability detected; monitor for arbitrage or feed manipulation`
              : `Cross-chain volatility is normal (${riskMetrics.volatility.index.toFixed(1)}) — prices are stable across chains`,
        },
        {
          dimension: 'Correlation Risk',
          contribution: corrScore * w.correlation,
          suggestion:
            riskMetrics.correlationRisk.level !== 'low'
              ? `High inter-chain correlation: ${topCorrelatedChains || 'multiple pairs'} — these chains likely use the same oracle provider; a provider failure would impact all simultaneously`
              : 'Chain sources are sufficiently independent — no high correlation risk',
        },
        {
          dimension: 'Data Freshness',
          contribution: freshScore * w.freshness,
          suggestion:
            riskMetrics.freshnessRisk.staleOracleCount > 0
              ? `${riskMetrics.freshnessRisk.staleOracleCount} chain(s) stale: ${topStaleChains || 'unknown'} — stale cross-chain data enables arbitrage attacks; verify oracle node health on affected chains`
              : 'All chain data is fresh — no staleness risk detected',
        },
        {
          dimension: 'Manipulation Resistance',
          contribution: manipScore * w.manipulationResistance,
          suggestion:
            riskMetrics.manipulationResistance.level !== 'low'
              ? `Manipulation resistance at ${riskMetrics.manipulationResistance.score}/100 — weakest factor is ${weakestManipFactorChain.label} (${weakestManipFactorChain.value}%); strengthen this to protect against cross-chain manipulation`
              : `Manipulation resistance is adequate (${riskMetrics.manipulationResistance.score}/100) — all sub-factors above threshold`,
        },
        {
          dimension: 'Shared Dependency',
          contribution: sharedScore * w.sharedDependency,
          suggestion:
            riskMetrics.sharedDependency.level !== 'low'
              ? `Shared oracle provider risk: ${topSharedProviders || 'shared providers detected'} — if the shared provider fails, ${riskMetrics.sharedDependency.sharedSourceGroups.reduce((sum, g) => sum + g.oracles.length, 0)} chain(s) lose price data simultaneously`
              : 'No shared oracle provider dependencies — chains use independent sources',
        },
      ]
        .filter((item) => item.contribution > 0)
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 5);

      const totalContribution = riskAttribution.reduce((sum, item) => sum + item.contribution, 0);
      if (totalContribution > 0) {
        for (const item of riskAttribution) {
          item.contribution = (item.contribution / totalContribution) * 100;
        }
      }

      const risk: CrossChainRiskResult = {
        riskLevel: overallRiskLevel,
        riskScore: overallRiskScore,
        riskColor: getRiskLevelColor(overallRiskLevel),
        hhiValue: riskMetrics.hhi.value,
        hhiLevel: riskMetrics.hhi.level,
        diversificationScore: riskMetrics.diversification.score,
        diversificationLevel: riskMetrics.diversification.level,
        volatilityIndex: riskMetrics.volatility.index,
        volatilityLevel: riskMetrics.volatility.level,
        correlationScore: riskMetrics.correlationRisk.score,
        correlationLevel: riskMetrics.correlationRisk.level,
        highCorrelationPairs: riskMetrics.correlationRisk.highCorrelationPairs,
        freshnessScore: riskMetrics.freshnessRisk.score,
        freshnessLevel: riskMetrics.freshnessRisk.level,
        staleOracles: riskMetrics.freshnessRisk.staleOracles,
        manipulationResistanceScore: riskMetrics.manipulationResistance.score,
        manipulationResistanceLevel: riskMetrics.manipulationResistance.level,
        manipulationResistanceFactors: riskMetrics.manipulationResistance.factors,
        sharedDependencyScore: riskMetrics.sharedDependency.score,
        sharedDependencyLevel: riskMetrics.sharedDependency.level,
        sharedSourceGroups: riskMetrics.sharedDependency.sharedSourceGroups,
        systemicRiskFactor: riskMetrics.sharedDependency.systemicRiskFactor,
        weights: riskMetrics.overallRisk.weights,
        divergenceAccelerationScore: divergenceAccelScore,
        divergenceAccelerationLevel: divergenceAccelLevel,
        feedBehaviorHealthAvg: feedBehaviorResult.overallHealthAvg,
        feedBehaviorHealthLevel: feedHealthRiskLevel,
        stabilityDecayScore,
        stabilityDecayLevel,
        riskAttribution,
      };

      const divergence: CrossChainDivergenceResult = {
        divergenceResult,
        timeSeries: divergenceResult.timeSeries,
        leadership: divergenceResult.leadership,
        divergenceMatrix: divergenceResult.divergenceMatrix,
        acceleratingCount: divergenceResult.acceleratingCount,
        directionalBiasCount: divergenceResult.directionalBiasCount,
        leadingOracle: divergenceResult.leadingOracle,
        maxAcceleration: divergenceResult.maxAcceleration,
      };

      const feed: CrossChainFeedResult = {
        feedBehaviorResult,
        rhythmMetrics: feedBehaviorResult.rhythmMetrics,
        confidenceMetrics: feedBehaviorResult.confidenceMetrics,
        heartbeatMetrics: feedBehaviorResult.heartbeatMetrics,
        healthScores: feedBehaviorResult.healthScores,
        overallHealthAvg: feedBehaviorResult.overallHealthAvg,
        overallHealthLevel: feedBehaviorResult.overallHealthLevel,
        anomalyCount: feedBehaviorResult.anomalyCount,
        heartbeatLostCount: feedBehaviorResult.heartbeatLostCount,
        confidenceSurgeCount: feedBehaviorResult.confidenceSurgeCount,
      };

      return {
        risk,
        divergence,
        feed,
        chainCount: chainPrices.length,
      };
    } catch (error) {
      logger.error(
        'Error calculating cross-chain analytics:',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        risk: getEmptyRiskResult(),
        divergence: getEmptyDivergenceResult(),
        feed: getEmptyFeedResult(),
        chainCount: chainPrices.length,
      };
    }
  }, [currentPrices, historySnapshot]);
}
