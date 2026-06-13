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
  type RiskMetrics,
  type RiskLevel,
  type RiskWeights,
  DEFAULT_RISK_WEIGHTS,
} from '@/lib/analytics/riskMetrics';
import {
  calculateStability,
  type StabilityResult,
  type StabilityScore as StabilityScoreType,
  type StabilityLevel,
} from '@/lib/analytics/stabilityScore';
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

export interface CrossChainRiskResult {
  riskMetrics: RiskMetrics | null;
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
  staleOracleCount: number;
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

interface CrossChainStabilityResult {
  stabilityResult: StabilityResult | null;
  scores: StabilityScoreType[];
  decliningCount: number;
  rapidlyDecliningCount: number;
  averageScore: number;
  averageLevel: StabilityLevel;
  worstProvider: string | null;
  worstScore: number;
}

interface CrossChainAnalyticsResult {
  risk: CrossChainRiskResult;
  divergence: CrossChainDivergenceResult;
  feed: CrossChainFeedResult;
  stability: CrossChainStabilityResult;
  chainCount: number;
  isCalculating: boolean;
}

function getEmptyRiskResult(): CrossChainRiskResult {
  return {
    riskMetrics: null,
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
    staleOracleCount: 0,
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

function getEmptyStabilityResult(): CrossChainStabilityResult {
  return {
    stabilityResult: null,
    scores: [],
    decliningCount: 0,
    rapidlyDecliningCount: 0,
    averageScore: 0,
    averageLevel: 'good',
    worstProvider: null,
    worstScore: 0,
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
        stability: getEmptyStabilityResult(),
        chainCount: chainPrices.length,
        isCalculating: false,
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
      for (const [chain, entries] of historySnapshot) {
        const prices = entries.filter((e) => e.success && e.price > 0).map((e) => e.price);
        if (prices.length > 0) {
          priceHistoriesByProvider.set(chain, prices);
        }
      }
      for (const p of chainPrices) {
        if (!priceHistoriesByProvider.has(p.chain!) && p.price > 0) {
          priceHistoriesByProvider.set(p.chain!, [p.price]);
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

      const historyMapForDivergence = new Map<
        string,
        Array<{ price: number; timestamp: number; success: boolean }>
      >();
      for (const [chain, entries] of historySnapshot) {
        historyMapForDivergence.set(
          chain,
          entries.map((e) => ({ price: e.price, timestamp: e.timestamp, success: e.success }))
        );
      }
      for (const p of chainPrices) {
        if (!historyMapForDivergence.has(p.chain!) && p.price > 0) {
          historyMapForDivergence.set(p.chain!, [
            { price: p.price, timestamp: p.timestamp, success: true },
          ]);
        }
      }

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

      const historyMapForFeed = new Map<
        string,
        Array<{
          price: number;
          timestamp: number;
          success: boolean;
          confidence?: number;
          confidenceInterval?: { bid: number; ask: number; widthPercentage: number };
        }>
      >();
      for (const [chain, entries] of historySnapshot) {
        historyMapForFeed.set(chain, [...entries]);
      }
      for (const p of chainPrices) {
        if (!historyMapForFeed.has(p.chain!) && p.price > 0) {
          historyMapForFeed.set(p.chain!, [
            {
              price: p.price,
              timestamp: p.timestamp,
              success: true,
              confidence: p.confidence,
              confidenceInterval: p.confidenceInterval,
            },
          ]);
        }
      }

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

      const historyMapForStability = new Map<
        string,
        Array<{ price: number; timestamp: number; success: boolean; confidence?: number }>
      >();
      for (const [chain, entries] of historySnapshot) {
        historyMapForStability.set(
          chain,
          entries.map((e) => ({
            price: e.price,
            timestamp: e.timestamp,
            success: e.success,
            confidence: e.confidence,
          }))
        );
      }
      for (const p of chainPrices) {
        if (!historyMapForStability.has(p.chain!) && p.price > 0) {
          historyMapForStability.set(p.chain!, [
            { price: p.price, timestamp: p.timestamp, success: true, confidence: p.confidence },
          ]);
        }
      }

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

      const riskAttribution = [
        {
          dimension: 'Market Concentration (HHI)',
          contribution: hhiScore * w.hhi,
          suggestion: 'Distribute oracle usage across more chains to reduce concentration',
        },
        {
          dimension: 'Diversification',
          contribution: divScore * w.diversification,
          suggestion: 'Add more chain sources to improve data diversity',
        },
        {
          dimension: 'Volatility',
          contribution: volScore * w.volatility,
          suggestion: 'Monitor high-volatility chains for price manipulation risk',
        },
        {
          dimension: 'Correlation Risk',
          contribution: corrScore * w.correlation,
          suggestion: 'Investigate chains with high price correlation for shared dependencies',
        },
        {
          dimension: 'Data Freshness',
          contribution: freshScore * w.freshness,
          suggestion: 'Check stale chains for oracle feed issues or network congestion',
        },
        {
          dimension: 'Manipulation Resistance',
          contribution: manipScore * w.manipulationResistance,
          suggestion: 'Verify on-chain verification and data source diversity per chain',
        },
        {
          dimension: 'Shared Dependency',
          contribution: sharedScore * w.sharedDependency,
          suggestion: 'Identify chains using the same oracle provider as a single point of failure',
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
        riskMetrics,
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
        staleOracleCount: riskMetrics.freshnessRisk.staleOracleCount,
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

      const stability: CrossChainStabilityResult = {
        stabilityResult,
        scores: stabilityResult.scores,
        decliningCount: stabilityResult.decliningCount,
        rapidlyDecliningCount: stabilityResult.rapidlyDecliningCount,
        averageScore: stabilityResult.averageScore,
        averageLevel: stabilityResult.averageLevel,
        worstProvider: stabilityResult.worstProvider,
        worstScore: stabilityResult.worstScore,
      };

      return {
        risk,
        divergence,
        feed,
        stability,
        chainCount: chainPrices.length,
        isCalculating: false,
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
        stability: getEmptyStabilityResult(),
        chainCount: chainPrices.length,
        isCalculating: false,
      };
    }
  }, [currentPrices, historySnapshot]);
}
