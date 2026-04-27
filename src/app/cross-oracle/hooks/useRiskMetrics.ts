import { useMemo } from 'react';

import {
  calculateRiskMetrics,
  getRiskLevelColor,
  buildRobustCorrelationMatrix,
  type RiskMetrics,
  type RiskLevel,
} from '@/lib/analytics/riskMetrics';
import { chartColors } from '@/lib/config/colors';
import { type PriceData, type OracleProvider } from '@/types/oracle';

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
  isCalculating: boolean;
}

export function useRiskMetrics(priceData: PriceData[]): RiskMetricsResult {
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
        isCalculating: false,
      };
    }

    try {
      const oracleData = priceData.map((p) => ({
        name: p.provider,
        share: 100 / priceData.length,
        color: chartColors.oracle[p.provider as OracleProvider] || '#888888',
        tvs: '$0',
        tvsValue: 0,
        chains: 1,
        protocols: 1,
        avgLatency: 0,
        accuracy: 0,
        updateFrequency: 0,
        change24h: p.change24h ?? 0,
        change7d: 0,
        change30d: 0,
      }));

      const priceHistory = priceData.map((p) => p.price);

      const providerPrices = new Map<string, number[]>();
      for (const pd of priceData) {
        const arr = providerPrices.get(pd.provider) || [];
        arr.push(pd.price);
        providerPrices.set(pd.provider, arr);
      }

      const { matrix: correlationMatrix } = buildRobustCorrelationMatrix(providerPrices);

      const metrics = calculateRiskMetrics(oracleData, priceHistory, correlationMatrix);

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
        isCalculating: false,
      };
    }
  }, [priceData]);

  return result;
}
