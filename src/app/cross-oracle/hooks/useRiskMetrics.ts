import { useMemo, useState, useEffect } from 'react';

import {
  calculateRiskMetrics,
  getRiskLevelColor,
  type RiskMetrics,
  type RiskLevel,
  type RiskWeights,
  DEFAULT_RISK_WEIGHTS,
} from '@/lib/analytics/riskMetrics';
import { chartColors } from '@/lib/config/colors';
import { getProviderDefaults } from '@/lib/oracles/utils/performanceMetricsConfig';
import { type PriceData, type OracleProvider } from '@/types/oracle';

import { type PriceHistoryMap } from './useOracleMemory';

export interface RiskMetricsResult {
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
  isCalculating: boolean;
}

function extractPriceHistories(priceHistoryMap: PriceHistoryMap): Map<string, number[]> {
  const result = new Map<string, number[]>();
  for (const [provider, history] of priceHistoryMap) {
    const prices = history.filter((h) => h.success && h.price > 0).map((h) => h.price);
    if (prices.length > 0) {
      result.set(provider, prices);
    }
  }
  return result;
}

export function useRiskMetrics(
  priceData: PriceData[],
  priceHistoryMapRef?: React.MutableRefObject<PriceHistoryMap> | null,
  _selectedSymbol?: string
): RiskMetricsResult {
  const [priceHistories, setPriceHistories] = useState<Map<string, number[]>>(new Map());

  useEffect(() => {
    if (priceHistoryMapRef?.current && priceHistoryMapRef.current.size > 0) {
      setPriceHistories(extractPriceHistories(priceHistoryMapRef.current));
    }
  }, [priceHistoryMapRef, priceData]);

  const result = useMemo(() => {
    if (priceData.length < 2) {
      return {
        riskMetrics: null,
        riskLevel: 'low' as RiskLevel,
        riskScore: 0,
        riskColor: getRiskLevelColor('low'),
        hhiValue: 0,
        hhiLevel: 'low' as RiskLevel,
        diversificationScore: 0,
        diversificationLevel: 'low' as RiskLevel,
        volatilityIndex: 0,
        volatilityLevel: 'low' as RiskLevel,
        correlationScore: 0,
        correlationLevel: 'low' as RiskLevel,
        highCorrelationPairs: [],
        freshnessScore: 0,
        freshnessLevel: 'low' as RiskLevel,
        staleOracleCount: 0,
        staleOracles: [],
        manipulationResistanceScore: 0,
        manipulationResistanceLevel: 'low' as RiskLevel,
        manipulationResistanceFactors: {
          dataSourceDiversity: 0,
          aggregationRobustness: 0,
          updateFrequency: 0,
          onChainVerification: 0,
        },
        sharedDependencyScore: 0,
        sharedDependencyLevel: 'low' as RiskLevel,
        sharedSourceGroups: [],
        systemicRiskFactor: 0,
        weights: DEFAULT_RISK_WEIGHTS,
        isCalculating: false,
      };
    }

    try {
      const oracleData = priceData.map((p) => {
        const defaults = getProviderDefaults(p.provider);
        return {
          name: p.provider,
          share: defaults.marketShare,
          color: chartColors.oracle[p.provider as OracleProvider] || '#888888',
          tvs: defaults.tvs,
          tvsValue: defaults.tvsValue,
          chains: defaults.chains,
          protocols: defaults.protocols,
          avgLatency: defaults.responseTime,
          accuracy: defaults.accuracy,
          updateFrequency: defaults.updateFrequency,
          change24h: p.change24h ?? 0,
          change7d: 0,
          change30d: 0,
        };
      });

      const priceHistoriesByProvider = new Map(priceHistories);

      if (priceHistoriesByProvider.size < 2) {
        for (const p of priceData) {
          if (!priceHistoriesByProvider.has(p.provider) && p.price > 0) {
            priceHistoriesByProvider.set(p.provider, [p.price]);
          }
        }
      }

      const oracleTimestamps = priceData.map((p) => ({
        name: p.provider,
        timestamp: p.timestamp,
      }));

      const manipulationResistanceData = priceData.map((p) => {
        const defaults = getProviderDefaults(p.provider);
        return {
          name: p.provider,
          dataSources: defaults.dataSources,
          updateFrequencySeconds: defaults.updateFrequency,
          hasOnChainVerification: defaults.hasOnChainVerification,
          aggregationMethod: defaults.aggregationMethod,
        };
      });

      const sharedDependencyData = priceData.map((p) => {
        const defaults = getProviderDefaults(p.provider);
        return {
          name: p.provider,
          primaryDataSources: defaults.primaryDataSources,
        };
      });

      const metrics = calculateRiskMetrics({
        oracleData,
        priceHistoriesByProvider,
        oracleTimestamps,
        manipulationResistanceData,
        sharedDependencyData,
      });

      return {
        riskMetrics: metrics,
        riskLevel: metrics.overallRisk.level,
        riskScore: metrics.overallRisk.score,
        riskColor: getRiskLevelColor(metrics.overallRisk.level),
        hhiValue: metrics.hhi.value,
        hhiLevel: metrics.hhi.level,
        diversificationScore: metrics.diversification.score,
        diversificationLevel: metrics.diversification.level,
        volatilityIndex: metrics.volatility.index,
        volatilityLevel: metrics.volatility.level,
        correlationScore: metrics.correlationRisk.score,
        correlationLevel: metrics.correlationRisk.level,
        highCorrelationPairs: metrics.correlationRisk.highCorrelationPairs,
        freshnessScore: metrics.freshnessRisk.score,
        freshnessLevel: metrics.freshnessRisk.level,
        staleOracleCount: metrics.freshnessRisk.staleOracleCount,
        staleOracles: metrics.freshnessRisk.staleOracles,
        manipulationResistanceScore: metrics.manipulationResistance.score,
        manipulationResistanceLevel: metrics.manipulationResistance.level,
        manipulationResistanceFactors: metrics.manipulationResistance.factors,
        sharedDependencyScore: metrics.sharedDependency.score,
        sharedDependencyLevel: metrics.sharedDependency.level,
        sharedSourceGroups: metrics.sharedDependency.sharedSourceGroups,
        systemicRiskFactor: metrics.sharedDependency.systemicRiskFactor,
        weights: metrics.overallRisk.weights,
        isCalculating: false,
      };
    } catch {
      return {
        riskMetrics: null,
        riskLevel: 'critical' as RiskLevel,
        riskScore: 100,
        riskColor: getRiskLevelColor('critical'),
        hhiValue: 0,
        hhiLevel: 'critical' as RiskLevel,
        diversificationScore: 0,
        diversificationLevel: 'critical' as RiskLevel,
        volatilityIndex: 0,
        volatilityLevel: 'critical' as RiskLevel,
        correlationScore: 0,
        correlationLevel: 'critical' as RiskLevel,
        highCorrelationPairs: [],
        freshnessScore: 0,
        freshnessLevel: 'critical' as RiskLevel,
        staleOracleCount: 0,
        staleOracles: [],
        manipulationResistanceScore: 0,
        manipulationResistanceLevel: 'critical' as RiskLevel,
        manipulationResistanceFactors: {
          dataSourceDiversity: 0,
          aggregationRobustness: 0,
          updateFrequency: 0,
          onChainVerification: 0,
        },
        sharedDependencyScore: 0,
        sharedDependencyLevel: 'critical' as RiskLevel,
        sharedSourceGroups: [],
        systemicRiskFactor: 0,
        weights: DEFAULT_RISK_WEIGHTS,
        isCalculating: false,
      };
    }
  }, [priceData, priceHistories]);

  return result;
}
