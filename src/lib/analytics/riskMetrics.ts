import { semanticColors, chartColors } from '@/lib/config/colors';
import { type OracleMarketData } from '@/lib/services/marketData/types';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('riskMetrics');

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface HHIResult {
  value: number;
  level: RiskLevel;
  description: string;
  concentrationRatio: number;
}

interface DiversificationResult {
  score: number;
  level: RiskLevel;
  description: string;
  factors: {
    chainDiversity: number;
    protocolDiversity: number;
    assetDiversity: number;
  };
}

interface VolatilityResult {
  index: number;
  level: RiskLevel;
  description: string;
  annualizedVolatility: number;
  dailyVolatility: number;
}

interface CorrelationRiskResult {
  score: number;
  level: RiskLevel;
  description: string;
  avgCorrelation: number;
  highCorrelationPairs: string[];
  correlationMatrix: number[][];
  oracleNames: string[];
}

export interface FreshnessRiskResult {
  score: number;
  level: RiskLevel;
  description: string;
  staleOracleCount: number;
  maxStalenessSeconds: number;
  staleOracles: Array<{ name: string; stalenessSeconds: number }>;
}

export interface ManipulationResistanceResult {
  score: number;
  level: RiskLevel;
  description: string;
  factors: {
    dataSourceDiversity: number;
    aggregationRobustness: number;
    updateFrequency: number;
    onChainVerification: number;
  };
}

export interface SharedDependencyResult {
  score: number;
  level: RiskLevel;
  description: string;
  sharedSourceGroups: Array<{
    source: string;
    oracles: string[];
  }>;
  systemicRiskFactor: number;
}

export interface RiskMetrics {
  hhi: HHIResult;
  diversification: DiversificationResult;
  volatility: VolatilityResult;
  correlationRisk: CorrelationRiskResult;
  freshnessRisk: FreshnessRiskResult;
  manipulationResistance: ManipulationResistanceResult;
  sharedDependency: SharedDependencyResult;
  overallRisk: {
    score: number;
    level: RiskLevel;
    timestamp: number;
    weights: RiskWeights;
  };
}

export interface RiskWeights {
  hhi: number;
  diversification: number;
  volatility: number;
  correlation: number;
  freshness: number;
  manipulationResistance: number;
  sharedDependency: number;
}

export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  hhi: 0.15,
  diversification: 0.15,
  volatility: 0.15,
  correlation: 0.15,
  freshness: 0.15,
  manipulationResistance: 0.15,
  sharedDependency: 0.1,
};

export function calculateHHI(marketShares: number[]): HHIResult {
  try {
    if (!marketShares || marketShares.length === 0) {
      throw new Error('Market shares array is empty');
    }

    const hhi =
      marketShares.reduce((sum, share) => {
        const decimalShare = share / 100;
        return sum + Math.pow(decimalShare, 2);
      }, 0) * 10000;

    const sortedShares = [...marketShares].sort((a, b) => b - a);
    const cr4 = sortedShares.slice(0, 4).reduce((sum, share) => sum + share, 0);

    let level: RiskLevel;
    let description: string;

    if (hhi < 1500) {
      level = 'low';
      description = 'market_concentration_low';
    } else if (hhi < 2500) {
      level = 'medium';
      description = 'market_concentration_medium';
    } else if (hhi < 3500) {
      level = 'high';
      description = 'market_concentration_high';
    } else {
      level = 'critical';
      description = 'market_concentration_critical';
    }

    logger.debug(`HHI calculated: ${hhi.toFixed(2)}, Level: ${level}`);

    return {
      value: Math.round(hhi),
      level,
      description,
      concentrationRatio: Number(cr4.toFixed(2)),
    };
  } catch (error) {
    logger.error(
      'Failed to calculate HHI',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      value: 0,
      level: 'critical',
      description: 'calculation_error',
      concentrationRatio: 0,
    };
  }
}

export function calculateHHIFromOracles(oracleData: OracleMarketData[]): HHIResult {
  const shares = oracleData.map((o) => o.share);
  return calculateHHI(shares);
}

export function calculateDiversificationScore(params: {
  chainCount: number;
  totalChains: number;
  protocolCount: number;
  totalProtocols: number;
  assetCount: number;
  totalAssets: number;
  entropy?: number;
  marketShares?: number[];
}): DiversificationResult {
  try {
    const {
      chainCount,
      totalChains,
      protocolCount,
      totalProtocols,
      assetCount,
      totalAssets,
      marketShares,
    } = params;

    let chainDiversity: number;
    let protocolDiversity: number;
    let assetDiversity: number;

    if (marketShares && marketShares.length > 0) {
      const shares = marketShares.filter((s) => s > 0);
      const n = shares.length;
      if (n <= 1) {
        chainDiversity = 0;
      } else {
        const rawEntropy = -shares.reduce((sum, s) => {
          const p = s / 100;
          return sum + (p > 0 ? p * Math.log(p) : 0);
        }, 0);
        const maxEntropy = Math.log(n);
        chainDiversity = maxEntropy > 0 ? (rawEntropy / maxEntropy) * 100 : 0;
      }
      protocolDiversity = Math.min((protocolCount / Math.max(n * 3, 1)) * 100, 100);
      assetDiversity = Math.min((assetCount / Math.max(n * 5, 1)) * 100, 100);
    } else {
      chainDiversity = totalChains > 0 ? Math.min((chainCount / totalChains) * 100, 100) : 0;
      protocolDiversity =
        totalProtocols > 0 ? Math.min((protocolCount / totalProtocols) * 100, 100) : 0;
      assetDiversity = totalAssets > 0 ? Math.min((assetCount / totalAssets) * 100, 100) : 0;
    }

    const score = Math.round(chainDiversity * 0.3 + protocolDiversity * 0.4 + assetDiversity * 0.3);

    let level: RiskLevel;
    let description: string;

    if (score >= 80) {
      level = 'low';
      description = 'diversification_excellent';
    } else if (score >= 60) {
      level = 'low';
      description = 'diversification_good';
    } else if (score >= 40) {
      level = 'medium';
      description = 'diversification_moderate';
    } else if (score >= 20) {
      level = 'high';
      description = 'diversification_poor';
    } else {
      level = 'critical';
      description = 'diversification_critical';
    }

    logger.debug(`Diversification score: ${score}, Level: ${level}`);

    return {
      score,
      level,
      description,
      factors: {
        chainDiversity: Math.round(chainDiversity),
        protocolDiversity: Math.round(protocolDiversity),
        assetDiversity: Math.round(assetDiversity),
      },
    };
  } catch (error) {
    logger.error(
      'Failed to calculate diversification score',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      score: 0,
      level: 'critical',
      description: 'calculation_error',
      factors: {
        chainDiversity: 0,
        protocolDiversity: 0,
        assetDiversity: 0,
      },
    };
  }
}

export function calculateVolatilityIndex(priceHistory: number[]): VolatilityResult {
  try {
    if (priceHistory.length < 2) {
      throw new Error('Insufficient price history data');
    }

    const returns: number[] = [];
    for (let i = 1; i < priceHistory.length; i++) {
      if (priceHistory[i] > 0 && priceHistory[i - 1] > 0) {
        const logReturn = Math.log(priceHistory[i] / priceHistory[i - 1]);
        returns.push(logReturn);
      }
    }

    if (returns.length === 0) {
      throw new Error('Unable to calculate returns from price history');
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
      Math.max(returns.length - 1, 1);

    const dailyVolatility = Math.sqrt(variance);

    const annualizedVolatility = dailyVolatility * Math.sqrt(365);

    const index = Math.min(Math.round(annualizedVolatility * 100), 100);

    let level: RiskLevel;
    let description: string;

    if (index < 20) {
      level = 'low';
      description = 'volatility_low';
    } else if (index < 40) {
      level = 'medium';
      description = 'volatility_moderate';
    } else if (index < 60) {
      level = 'high';
      description = 'volatility_high';
    } else {
      level = 'critical';
      description = 'volatility_extreme';
    }

    logger.debug(`Volatility index: ${index}, Daily: ${dailyVolatility.toFixed(4)}`);

    return {
      index,
      level,
      description,
      annualizedVolatility: Number(annualizedVolatility.toFixed(4)),
      dailyVolatility: Number(dailyVolatility.toFixed(4)),
    };
  } catch (error) {
    logger.error(
      'Failed to calculate volatility index',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      index: 0,
      level: 'critical',
      description: 'calculation_error',
      annualizedVolatility: 0,
      dailyVolatility: 0,
    };
  }
}

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denominator = Math.sqrt(sumX2 * sumY2);
  if (denominator === 0) return 0;
  return sumXY / denominator;
}

function calculateSpearmanCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const getRanks = (data: number[]): number[] => {
    const indexed = data.map((value, index) => ({ value, index }));
    indexed.sort((a, b) => a.value - b.value);

    const ranks = new Array(data.length);
    let i = 0;
    while (i < indexed.length) {
      let j = i;
      while (j < indexed.length - 1 && indexed[j + 1].value === indexed[i].value) {
        j++;
      }

      const avgRank = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) {
        ranks[indexed[k].index] = avgRank;
      }
      i = j + 1;
    }
    return ranks;
  };

  const xRanks = getRanks(x.slice(0, n));
  const yRanks = getRanks(y.slice(0, n));

  const meanXRank = xRanks.reduce((a, b) => a + b, 0) / n;
  const meanYRank = yRanks.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xRanks[i] - meanXRank;
    const dy = yRanks[i] - meanYRank;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denominator = Math.sqrt(sumX2 * sumY2);
  if (denominator === 0) return 0;
  return sumXY / denominator;
}

function calculateRobustCorrelation(x: number[], y: number[]): number {
  const pearson = calculatePearsonCorrelation(x, y);
  const spearman = calculateSpearmanCorrelation(x, y);

  const diff = Math.abs(pearson - spearman);
  if (diff > 0.3) {
    return spearman * 0.7 + pearson * 0.3;
  }

  return (pearson + spearman) / 2;
}

export function calculateCorrelationRisk(
  correlationMatrix: number[][],
  oracleNames: string[]
): CorrelationRiskResult {
  try {
    if (!correlationMatrix.length || correlationMatrix.length !== oracleNames.length) {
      throw new Error('Invalid correlation matrix or oracle names');
    }

    const n = correlationMatrix.length;
    let totalCorrelation = 0;
    let pairCount = 0;
    const highCorrelationPairs: string[] = [];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const corr = Math.abs(correlationMatrix[i][j]);
        totalCorrelation += corr;
        pairCount++;

        if (corr > 0.8) {
          highCorrelationPairs.push(
            `${oracleNames[i]} - ${oracleNames[j]} (${(corr * 100).toFixed(1)}%)`
          );
        }
      }
    }

    const avgCorrelation = pairCount > 0 ? totalCorrelation / pairCount : 0;

    const score = Math.round(avgCorrelation * 100);

    let level: RiskLevel;
    let description: string;

    if (score < 40) {
      level = 'low';
      description = 'correlation_risk_low';
    } else if (score < 60) {
      level = 'medium';
      description = 'correlation_risk_moderate';
    } else if (score < 80) {
      level = 'high';
      description = 'correlation_risk_high';
    } else {
      level = 'critical';
      description = 'correlation_risk_critical';
    }

    logger.debug(`Correlation risk score: ${score}, Avg correlation: ${avgCorrelation.toFixed(4)}`);

    return {
      score,
      level,
      description,
      avgCorrelation: Number(avgCorrelation.toFixed(4)),
      highCorrelationPairs: highCorrelationPairs.slice(0, 5),
      correlationMatrix,
      oracleNames,
    };
  } catch (error) {
    logger.error(
      'Failed to calculate correlation risk',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      score: 0,
      level: 'critical',
      description: 'calculation_error',
      avgCorrelation: 0,
      highCorrelationPairs: [],
      correlationMatrix: [],
      oracleNames: [],
    };
  }
}

export function calculateFreshnessRisk(params: {
  oracleTimestamps: Array<{ name: string; timestamp: number }>;
  currentTime?: number;
}): FreshnessRiskResult {
  try {
    const { oracleTimestamps, currentTime } = params;
    const now = currentTime ?? Date.now();

    if (!oracleTimestamps || oracleTimestamps.length === 0) {
      throw new Error('No oracle timestamp data');
    }

    const staleOracles: Array<{ name: string; stalenessSeconds: number }> = [];
    let totalStalenessScore = 0;

    const FRESH = 30;
    const NORMAL = 60;
    const DELAYED = 120;
    const SEVERELY_DELAYED = 300;

    for (const oracle of oracleTimestamps) {
      const stalenessSeconds = Math.max(0, Math.floor((now - oracle.timestamp) / 1000));

      let oracleStalenessScore = 0;
      if (stalenessSeconds <= FRESH) {
        oracleStalenessScore = (stalenessSeconds / FRESH) * 10;
      } else if (stalenessSeconds <= NORMAL) {
        oracleStalenessScore = 10 + ((stalenessSeconds - FRESH) / (NORMAL - FRESH)) * 20;
      } else if (stalenessSeconds <= DELAYED) {
        oracleStalenessScore = 30 + ((stalenessSeconds - NORMAL) / (DELAYED - NORMAL)) * 30;
      } else if (stalenessSeconds <= SEVERELY_DELAYED) {
        oracleStalenessScore =
          60 + ((stalenessSeconds - DELAYED) / (SEVERELY_DELAYED - DELAYED)) * 25;
      } else {
        oracleStalenessScore = Math.min(85 + ((stalenessSeconds - SEVERELY_DELAYED) / 60) * 5, 100);
      }

      totalStalenessScore += oracleStalenessScore;

      if (stalenessSeconds > DELAYED) {
        staleOracles.push({ name: oracle.name, stalenessSeconds });
      }
    }

    const score = Math.min(Math.round(totalStalenessScore / oracleTimestamps.length), 100);

    let level: RiskLevel;
    let description: string;

    if (score < 20) {
      level = 'low';
      description = 'freshness_risk_low';
    } else if (score < 40) {
      level = 'medium';
      description = 'freshness_risk_moderate';
    } else if (score < 65) {
      level = 'high';
      description = 'freshness_risk_high';
    } else {
      level = 'critical';
      description = 'freshness_risk_critical';
    }

    const maxStalenessSeconds =
      oracleTimestamps.length > 0
        ? Math.max(
            ...oracleTimestamps.map((o) => Math.max(0, Math.floor((now - o.timestamp) / 1000)))
          )
        : 0;

    logger.debug(`Freshness risk score: ${score}, Stale oracles: ${staleOracles.length}`);

    return {
      score,
      level,
      description,
      staleOracleCount: staleOracles.length,
      maxStalenessSeconds,
      staleOracles: staleOracles
        .sort((a, b) => b.stalenessSeconds - a.stalenessSeconds)
        .slice(0, 5),
    };
  } catch (error) {
    logger.error(
      'Failed to calculate freshness risk',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      score: 0,
      level: 'critical',
      description: 'calculation_error',
      staleOracleCount: 0,
      maxStalenessSeconds: 0,
      staleOracles: [],
    };
  }
}

export function calculateManipulationResistance(params: {
  oracleData: Array<{
    name: string;
    dataSources: number;
    updateFrequencySeconds: number;
    hasOnChainVerification: boolean;
    aggregationMethod: 'median' | 'weighted_average' | 'simple_average' | 'unknown';
  }>;
}): ManipulationResistanceResult {
  try {
    const { oracleData } = params;

    if (!oracleData || oracleData.length === 0) {
      throw new Error('No oracle data for manipulation resistance');
    }

    let totalDataSourceDiversity = 0;
    let totalAggregationRobustness = 0;
    let totalUpdateFrequency = 0;
    let totalOnChainVerification = 0;

    for (const oracle of oracleData) {
      const dataSourceScore = Math.min(oracle.dataSources / 10, 1) * 100;
      totalDataSourceDiversity += dataSourceScore;

      const aggregationScores: Record<string, number> = {
        median: 100,
        weighted_average: 80,
        simple_average: 60,
        unknown: 30,
      };
      totalAggregationRobustness += aggregationScores[oracle.aggregationMethod] ?? 30;

      let freqScore = 0;
      if (oracle.updateFrequencySeconds <= 1) {
        freqScore = 100;
      } else if (oracle.updateFrequencySeconds <= 10) {
        freqScore = 90;
      } else if (oracle.updateFrequencySeconds <= 60) {
        freqScore = 75;
      } else if (oracle.updateFrequencySeconds <= 300) {
        freqScore = 55;
      } else if (oracle.updateFrequencySeconds <= 3600) {
        freqScore = 35;
      } else {
        freqScore = 15;
      }
      totalUpdateFrequency += freqScore;

      totalOnChainVerification += oracle.hasOnChainVerification ? 100 : 20;
    }

    const n = oracleData.length;
    const factors = {
      dataSourceDiversity: Math.round(totalDataSourceDiversity / n),
      aggregationRobustness: Math.round(totalAggregationRobustness / n),
      updateFrequency: Math.round(totalUpdateFrequency / n),
      onChainVerification: Math.round(totalOnChainVerification / n),
    };

    const score = Math.round(
      factors.dataSourceDiversity * 0.3 +
        factors.aggregationRobustness * 0.25 +
        factors.updateFrequency * 0.25 +
        factors.onChainVerification * 0.2
    );

    const riskScore = 100 - score;

    let level: RiskLevel;
    let description: string;

    if (riskScore < 20) {
      level = 'low';
      description = 'manipulation_resistance_low';
    } else if (riskScore < 40) {
      level = 'medium';
      description = 'manipulation_resistance_moderate';
    } else if (riskScore < 60) {
      level = 'high';
      description = 'manipulation_resistance_high';
    } else {
      level = 'critical';
      description = 'manipulation_resistance_critical';
    }

    logger.debug(`Manipulation resistance risk score: ${riskScore}`);

    return {
      score: riskScore,
      level,
      description,
      factors,
    };
  } catch (error) {
    logger.error(
      'Failed to calculate manipulation resistance',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      score: 0,
      level: 'critical',
      description: 'calculation_error',
      factors: {
        dataSourceDiversity: 0,
        aggregationRobustness: 0,
        updateFrequency: 0,
        onChainVerification: 0,
      },
    };
  }
}

export function calculateSharedDependency(params: {
  oracleData: Array<{
    name: string;
    primaryDataSources: string[];
  }>;
}): SharedDependencyResult {
  try {
    const { oracleData } = params;

    if (!oracleData || oracleData.length === 0) {
      throw new Error('No oracle data for shared dependency');
    }

    const sourceToOracles = new Map<string, string[]>();
    for (const oracle of oracleData) {
      for (const source of oracle.primaryDataSources) {
        const existing = sourceToOracles.get(source) ?? [];
        if (!existing.includes(oracle.name)) {
          existing.push(oracle.name);
        }
        sourceToOracles.set(source, existing);
      }
    }

    const sharedSourceGroups: Array<{ source: string; oracles: string[] }> = [];
    for (const [source, oracles] of sourceToOracles) {
      if (oracles.length > 1) {
        sharedSourceGroups.push({ source, oracles });
      }
    }

    sharedSourceGroups.sort((a, b) => b.oracles.length - a.oracles.length);

    const totalOracles = oracleData.length;
    let maxOverlapRatio = 0;
    for (const group of sharedSourceGroups) {
      const ratio = group.oracles.length / totalOracles;
      maxOverlapRatio = Math.max(maxOverlapRatio, ratio);
    }

    const avgOverlapRatio =
      sharedSourceGroups.length > 0
        ? sharedSourceGroups.reduce((sum, g) => sum + g.oracles.length / totalOracles, 0) /
          sharedSourceGroups.length
        : 0;

    const systemicRiskFactor = Number((maxOverlapRatio * 0.6 + avgOverlapRatio * 0.4).toFixed(4));

    const score = Math.min(Math.round(systemicRiskFactor * 100), 100);

    let level: RiskLevel;
    let description: string;

    if (score < 25) {
      level = 'low';
      description = 'shared_dependency_low';
    } else if (score < 50) {
      level = 'medium';
      description = 'shared_dependency_moderate';
    } else if (score < 75) {
      level = 'high';
      description = 'shared_dependency_high';
    } else {
      level = 'critical';
      description = 'shared_dependency_critical';
    }

    logger.debug(`Shared dependency score: ${score}, Systemic risk: ${systemicRiskFactor}`);

    return {
      score,
      level,
      description,
      sharedSourceGroups: sharedSourceGroups.slice(0, 5),
      systemicRiskFactor,
    };
  } catch (error) {
    logger.error(
      'Failed to calculate shared dependency',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      score: 0,
      level: 'critical',
      description: 'calculation_error',
      sharedSourceGroups: [],
      systemicRiskFactor: 0,
    };
  }
}

export function buildRobustCorrelationMatrix(priceHistories: Map<string, number[]>): {
  matrix: number[][];
  names: string[];
} {
  const names = Array.from(priceHistories.keys());
  const n = names.length;
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const x = priceHistories.get(names[i]) ?? [];
      const y = priceHistories.get(names[j]) ?? [];
      const correlation = calculateRobustCorrelation(x, y);
      matrix[i][j] = correlation;
      matrix[j][i] = correlation;
    }
  }

  return { matrix, names };
}

export interface RiskMetricsInput {
  oracleData: OracleMarketData[];
  priceHistoriesByProvider: Map<string, number[]>;
  oracleTimestamps: Array<{ name: string; timestamp: number }>;
  manipulationResistanceData: Array<{
    name: string;
    dataSources: number;
    updateFrequencySeconds: number;
    hasOnChainVerification: boolean;
    aggregationMethod: 'median' | 'weighted_average' | 'simple_average' | 'unknown';
  }>;
  sharedDependencyData: Array<{
    name: string;
    primaryDataSources: string[];
  }>;
  weights?: Partial<RiskWeights>;
}

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

    const allPrices: number[] = [];
    for (const prices of priceHistoriesByProvider.values()) {
      allPrices.push(...prices);
    }
    const volatility =
      allPrices.length >= 2
        ? calculateVolatilityIndex(allPrices)
        : {
            index: 0,
            level: 'low' as RiskLevel,
            description: 'volatility_insufficient_data',
            annualizedVolatility: 0,
            dailyVolatility: 0,
          };

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
    critical: chartColors.oracle['pyth'],
  };
  return colors[level];
}

export function getRiskLevelText(level: RiskLevel): string {
  const texts: Record<RiskLevel, string> = {
    low: 'risk_level_low',
    medium: 'risk_level_medium',
    high: 'risk_level_high',
    critical: 'risk_level_critical',
  };
  return texts[level];
}
