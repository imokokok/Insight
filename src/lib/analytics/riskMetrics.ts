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
}

export interface RiskMetrics {
  hhi: HHIResult;
  diversification: DiversificationResult;
  volatility: VolatilityResult;
  correlationRisk: CorrelationRiskResult;
  overallRisk: {
    score: number;
    level: RiskLevel;
    timestamp: number;
  };
}

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

export function calculateRiskMetrics(
  oracleData: OracleMarketData[],
  priceHistory: number[],
  correlationMatrix: number[][]
): RiskMetrics {
  try {
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
    });

    const volatility = calculateVolatilityIndex(priceHistory);

    const oracleNames = oracleData.map((o) => o.name);
    const correlationRisk = calculateCorrelationRisk(correlationMatrix, oracleNames);

    const weights = {
      hhi: 0.25,
      diversification: 0.25,
      volatility: 0.3,
      correlation: 0.2,
    };

    const hhiScore = Math.min((hhi.value / 10000) * 100, 100);
    const divScore = 100 - diversification.score;
    const volScore = volatility.index;
    const corrScore = correlationRisk.score;

    const overallScore = Math.round(
      hhiScore * weights.hhi +
        divScore * weights.diversification +
        volScore * weights.volatility +
        corrScore * weights.correlation
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
      overallRisk: {
        score: overallScore,
        level: overallLevel,
        timestamp: Date.now(),
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
      },
      overallRisk: {
        score: 0,
        level: 'critical',
        timestamp: Date.now(),
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
