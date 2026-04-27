/**
 * Risk metrics calculation module
 *
 * Provides calculation functions for market concentration risk, diversification score, volatility index, and correlation risk assessment
 */

import { semanticColors, chartColors } from '@/lib/config/colors';
import { type OracleMarketData } from '@/lib/services/marketData/types';
import { safeMax } from '@/lib/utils';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('riskMetrics');

/**
 * Risk level
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * HHI index result
 */
interface HHIResult {
  value: number; // HHI value (0-10000)
  level: RiskLevel; // Risk level
  description: string; // Description
  concentrationRatio: number; // Concentration ratio (CR4)
}

/**
 * Diversification score result
 */
interface DiversificationResult {
  score: number; // Score (0-100)
  level: RiskLevel;
  description: string;
  factors: {
    chainDiversity: number;
    protocolDiversity: number;
    assetDiversity: number;
  };
}

/**
 * Volatility index result
 */
interface VolatilityResult {
  index: number; // volatility index (0-100)
  level: RiskLevel;
  description: string;
  annualizedVolatility: number;
  dailyVolatility: number;
}

/**
 * Correlation risk assessment result
 */
interface CorrelationRiskResult {
  score: number; // Score (0-100)
  level: RiskLevel;
  description: string;
  avgCorrelation: number;
  highCorrelationPairs: string[];
}

/**
 * comprehensive risk metrics
 */
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

/**
 * calculate HHI (Herfindahl-Hirschman Index) exponential
 * HHI = Σ(si²) * 10000, in si is i market share()
 *
 * HHI range: 0-10000
 * - < 1500: concentration ()
 * - 1500-2500: inconcentration
 * - > 2500: concentration ()
 *
 * @param marketShares market sharearray (， 25.5 25.5%)
 * @returns HHI calculateresult
 */
export function calculateHHI(marketShares: number[]): HHIResult {
  try {
    if (!marketShares || marketShares.length === 0) {
      throw new Error('Market shares array is empty');
    }

    // willconvertascalculateand
    const hhi =
      marketShares.reduce((sum, share) => {
        const decimalShare = share / 100;
        return sum + Math.pow(decimalShare, 2);
      }, 0) * 10000;

    // calculate CR4 (before4concentration)
    const sortedShares = [...marketShares].sort((a, b) => b - a);
    const cr4 = sortedShares.slice(0, 4).reduce((sum, share) => sum + share, 0);

    // Risk level
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

/**
 * fromcalculate HHI
 *
 * @param oracleData
 * @returns HHI calculateresult
 */
export function calculateHHIFromOracles(oracleData: OracleMarketData[]): HHIResult {
  const shares = oracleData.map((o) => o.share);
  return calculateHHI(shares);
}

/**
 * Calculate diversification score
 * 、andscore
 *
 * @param params diversificationparameter
 * @returns Diversification score result
 */
export function calculateDiversificationScore(params: {
  chainCount: number;
  totalChains: number;
  protocolCount: number;
  totalProtocols: number;
  assetCount: number;
  totalAssets: number;
  entropy?: number; // value (optional)
}): DiversificationResult {
  try {
    const { chainCount, totalChains, protocolCount, totalProtocols, assetCount, totalAssets } =
      params;

    // calculate (0-100)
    const chainDiversity = Math.min((chainCount / Math.max(totalChains * 0.5, 1)) * 100, 100);
    const protocolDiversity = Math.min(
      (protocolCount / Math.max(totalProtocols * 0.3, 1)) * 100,
      100
    );
    const assetDiversity = Math.min((assetCount / Math.max(totalAssets * 0.5, 1)) * 100, 100);

    //
    const score = Math.round(chainDiversity * 0.3 + protocolDiversity * 0.4 + assetDiversity * 0.3);

    // Risk level ()
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

/**
 * Calculate volatility index
 * standard deviationcalculate
 *
 * @param priceHistory history
 * @returns Volatility index result
 */
export function calculateVolatilityIndex(priceHistory: number[]): VolatilityResult {
  try {
    if (priceHistory.length < 2) {
      throw new Error('Insufficient price history data');
    }

    // calculatelogarithmic
    const returns: number[] = [];
    for (let i = 1; i < priceHistory.length; i++) {
      // Add division by zero check
      if (priceHistory[i] > 0 && priceHistory[i - 1] > 0) {
        const logReturn = Math.log(priceHistory[i] / priceHistory[i - 1]);
        returns.push(logReturn);
      }
    }

    if (returns.length === 0) {
      throw new Error('Unable to calculate returns from price history');
    }

    // calculate
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // calculatevariance
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
      Math.max(returns.length - 1, 1);

    // (standard deviation)
    const dailyVolatility = Math.sqrt(variance);

    // (hypothesis 365 days)
    const annualizedVolatility = dailyVolatility * Math.sqrt(365);

    // convertasexponential (0-100)
    const index = Math.min(Math.round(annualizedVolatility * 100), 100);

    // Risk level
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

/**
 * calculatecorrelation
 * correlation coefficientevaluationsystem
 *
 * @param correlationMatrix correlation coefficient
 * @param oracleNames namearray
 * @returns Correlation risk assessment result
 */
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

    // calculatecorrelation coefficient (calculateon)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const corr = Math.abs(correlationMatrix[i][j]);
        totalCorrelation += corr;
        pairCount++;

        // recordcorrelationfor (>0.8)
        if (corr > 0.8) {
          highCorrelationPairs.push(
            `${oracleNames[i]} - ${oracleNames[j]} (${(corr * 100).toFixed(1)}%)`
          );
        }
      }
    }

    const avgCorrelation = pairCount > 0 ? totalCorrelation / pairCount : 0;

    // convertasScore (0-100)，correlation
    const score = Math.round(avgCorrelation * 100);

    // Risk level
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
      highCorrelationPairs: highCorrelationPairs.slice(0, 5), // return5
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

/**
 * calculatecomprehensive risk metrics
 *
 * @param oracleData
 * @param priceHistory history
 * @param correlationMatrix correlation coefficient
 * @returns comprehensive risk metrics
 */
export function calculateRiskMetrics(
  oracleData: OracleMarketData[],
  priceHistory: number[],
  correlationMatrix: number[][]
): RiskMetrics {
  try {
    // calculate HHI
    const hhi = calculateHHIFromOracles(oracleData);

    // Calculate diversification score
    const totalProtocols = oracleData.reduce((sum, o) => sum + o.protocols, 0);
    const diversification = calculateDiversificationScore({
      chainCount: oracleData.reduce((sum, o) => sum + o.chains, 0),
      totalChains: Math.max(
        oracleData.reduce((sum, o) => sum + o.chains, 0),
        1
      ),
      protocolCount: totalProtocols,
      totalProtocols: Math.max(totalProtocols * 1.5, totalProtocols + 1),
      assetCount: oracleData.length,
      totalAssets: Math.max(oracleData.length * 1.5, 1),
    });

    // calculate
    const volatility = calculateVolatilityIndex(priceHistory);

    // calculatecorrelation
    const oracleNames = oracleData.map((o) => o.name);
    const correlationRisk = calculateCorrelationRisk(correlationMatrix, oracleNames);

    // calculaterisk score ()
    // HHI weight 30%，diversification 25%， 25%，correlation 20%
    const weights = {
      hhi: 0.3,
      diversification: 0.25,
      volatility: 0.25,
      correlation: 0.2,
    };

    // standardizationmetricto 0-100
    // HHI rangeis 0-10000，with 100 to 0-100
    // HHI ，withuse hhi.value / 100
    const hhiScore = Math.min((hhi.value / 10000) * 100, 100); // HHI standardizationto 0-100
    const divScore = 100 - diversification.score; // diversification
    const volScore = volatility.index;
    const corrScore = correlationRisk.score;

    const overallScore = Math.round(
      hhiScore * weights.hhi +
        divScore * weights.diversification +
        volScore * weights.volatility +
        corrScore * weights.correlation
    );

    // Risk level
    let overallLevel: RiskLevel;
    if (overallScore < 30) {
      overallLevel = 'low';
    } else if (overallScore < 50) {
      overallLevel = 'medium';
    } else if (overallScore < 70) {
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

    // returndefaultresult
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

/**
 * getRisk levelcolor
 *
 * @param level Risk level
 * @returns colorcode
 */
export function getRiskLevelColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    low: semanticColors.success.DEFAULT,
    medium: semanticColors.warning.DEFAULT,
    high: semanticColors.danger.DEFAULT,
    critical: chartColors.oracle['pyth'],
  };
  return colors[level];
}

/**
 * getRisk leveltext
 *
 * @param level Risk level
 * @returns localtext
 */
export function getRiskLevelText(level: RiskLevel): string {
  const texts: Record<RiskLevel, string> = {
    low: 'risk_level_low',
    medium: 'risk_level_medium',
    high: 'risk_level_high',
    critical: 'risk_level_critical',
  };
  return texts[level];
}
