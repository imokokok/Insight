import { semanticColors } from '@/lib/config/colors';

import { calculateHHIFromOracles, calculateDiversificationScore } from './concentrationMetrics';
import { buildRobustCorrelationMatrix, calculateCorrelationRisk } from './correlationMetrics';
import {
  calculateFreshnessRisk,
  calculateManipulationResistance,
  calculateSharedDependency,
} from './riskIndicators';
import { DEFAULT_RISK_WEIGHTS, riskMetricsLogger as logger } from './types';
import { aggregateVolatilityResults, calculateVolatilityIndex } from './volatilityMetrics';

import type { RiskLevel, RiskMetrics, RiskMetricsInput, VolatilityResult } from './types';

export type { RiskLevel, RiskMetrics, RiskWeights } from './types';

export { DEFAULT_RISK_WEIGHTS } from './types';
export { calculateSharedDependency } from './riskIndicators';

export function calculateRiskMetrics(input: RiskMetricsInput): RiskMetrics {
  try {
    const weights = { ...DEFAULT_RISK_WEIGHTS, ...input.weights };
    const { oracleData, priceHistoriesByProvider, oracleTimestamps } = input;

    const hhi = calculateHHIFromOracles(oracleData);

    const totalProtocols = oracleData.reduce((sum, o) => sum + o.protocols, 0);
    const totalChains = oracleData.reduce((sum, o) => sum + o.chains, 0);
    const diversification = calculateDiversificationScore({
      chainCount: totalChains,
      totalChains: Math.max(totalChains, 1),
      protocolCount: totalProtocols,
      totalProtocols: Math.max(totalProtocols * 1.5, totalProtocols + 1),
      assetCount: oracleData.length,
      totalAssets: Math.max(oracleData.length * 1.5, 1),
      marketShares: oracleData.map((o) => o.share),
    });

    const providerVolatilities: VolatilityResult[] = [];
    for (const [provider, prices] of priceHistoriesByProvider) {
      if (prices.length >= 2) {
        const timestamps = input.priceHistoryTimestampsByProvider?.get(provider);
        providerVolatilities.push(calculateVolatilityIndex(prices, timestamps));
      }
    }
    const volatility = aggregateVolatilityResults(providerVolatilities);

    const { matrix: correlationMatrix, names: corrOracleNames } =
      buildRobustCorrelationMatrix(priceHistoriesByProvider);
    const correlationRisk = calculateCorrelationRisk(correlationMatrix, corrOracleNames);

    const freshnessRisk = calculateFreshnessRisk({
      oracleTimestamps,
    });

    const manipulationResistance = calculateManipulationResistance({
      oracleData: input.manipulationResistanceData,
    });

    const sharedDependency = calculateSharedDependency({
      oracleData: input.sharedDependencyData,
    });

    const hhiScore = Math.min((hhi.value / 10000) * 100, 100);
    const divScore = 100 - diversification.score;
    const volScore = volatility.index;
    const corrScore = correlationRisk.score;
    const freshScore = freshnessRisk.score;
    const manipScore = manipulationResistance.score;
    const sharedScore = sharedDependency.score;

    const overallScore = Math.round(
      hhiScore * weights.hhi +
        divScore * weights.diversification +
        volScore * weights.volatility +
        corrScore * weights.correlation +
        freshScore * weights.freshness +
        manipScore * weights.manipulationResistance +
        sharedScore * weights.sharedDependency
    );

    let overallLevel: RiskLevel;
    if (overallScore < 25) {
      overallLevel = 'low';
    } else if (overallScore < 45) {
      overallLevel = 'medium';
    } else if (overallScore < 65) {
      overallLevel = 'high';
    } else {
      overallLevel = 'critical';
    }

    logger.info(`Risk metrics calculated. Overall score: ${overallScore}, Level: ${overallLevel}`);

    return {
      hhi,
      diversification,
      volatility,
      correlationRisk,
      freshnessRisk,
      manipulationResistance,
      sharedDependency,
      overallRisk: {
        score: overallScore,
        level: overallLevel,
        timestamp: Date.now(),
        weights,
      },
    };
  } catch (error) {
    logger.error(
      'Failed to calculate risk metrics',
      error instanceof Error ? error : new Error(String(error))
    );

    return {
      hhi: {
        value: 0,
        level: 'critical',
        description: 'calculation_error',
        concentrationRatio: 0,
      },
      diversification: {
        score: 0,
        level: 'critical',
        description: 'calculation_error',
        factors: {
          chainDiversity: 0,
          protocolDiversity: 0,
          assetDiversity: 0,
        },
      },
      volatility: {
        index: 0,
        level: 'critical',
        description: 'calculation_error',
        annualizedVolatility: 0,
        dailyVolatility: 0,
      },
      correlationRisk: {
        score: 0,
        level: 'critical',
        description: 'calculation_error',
        avgCorrelation: 0,
        highCorrelationPairs: [],
        correlationMatrix: [],
        oracleNames: [],
      },
      freshnessRisk: {
        score: 0,
        level: 'critical',
        description: 'calculation_error',
        staleOracleCount: 0,
        maxStalenessSeconds: 0,
        staleOracles: [],
      },
      manipulationResistance: {
        score: 0,
        level: 'critical',
        description: 'calculation_error',
        factors: {
          dataSourceDiversity: 0,
          aggregationRobustness: 0,
          updateFrequency: 0,
          onChainVerification: 0,
        },
      },
      sharedDependency: {
        score: 0,
        level: 'critical',
        description: 'calculation_error',
        sharedSourceGroups: [],
        systemicRiskFactor: 0,
      },
      overallRisk: {
        score: 0,
        level: 'critical',
        timestamp: Date.now(),
        weights: DEFAULT_RISK_WEIGHTS,
      },
    };
  }
}

export function getRiskLevelColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    low: semanticColors.success.DEFAULT,
    medium: semanticColors.warning.DEFAULT,
    high: semanticColors.danger.DEFAULT,
    critical: semanticColors.danger.dark,
  };
  return colors[level];
}
