/**
 * 风险指标计算模块
 *
 * 提供市场集中度风险、多元化评分、波动率指数和相关性风险评估的计算功能
 */

import { semanticColors, chartColors } from '@/lib/config/colors';
import { type OracleMarketData } from '@/lib/services/marketData/types';
import { safeMax } from '@/lib/utils';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('riskMetrics');

/**
 * 风险等级
 */
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * HHI 指数结果
 */
interface HHIResult {
  value: number; // HHI 值 (0-10000)
  level: RiskLevel; // 风险等级
  description: string; // 描述
  concentrationRatio: number; // 集中度比率 (CR4)
}

/**
 * 多元化评分结果
 */
interface DiversificationResult {
  score: number; // 评分 (0-100)
  level: RiskLevel;
  description: string;
  factors: {
    chainDiversity: number;
    protocolDiversity: number;
    assetDiversity: number;
  };
}

/**
 * 波动率指数结果
 */
interface VolatilityResult {
  index: number; // 波动率指数 (0-100)
  level: RiskLevel;
  description: string;
  annualizedVolatility: number;
  dailyVolatility: number;
}

/**
 * 相关性风险评估结果
 */
interface CorrelationRiskResult {
  score: number; // 风险评分 (0-100)
  level: RiskLevel;
  description: string;
  avgCorrelation: number;
  highCorrelationPairs: string[];
}

/**
 * 综合风险指标
 */
interface RiskMetrics {
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
 * 计算 HHI (Herfindahl-Hirschman Index) 指数
 * HHI = Σ(si²) * 10000, 其中 si 是第 i 个企业的市场份额(小数)
 *
 * HHI 范围: 0-10000
 * - < 1500: 低集中度 (竞争型)
 * - 1500-2500: 中度集中度
 * - > 2500: 高度集中度 (垄断型)
 *
 * @param marketShares 市场份额数组 (百分比，如 25.5 表示 25.5%)
 * @returns HHI 计算结果
 */
export function calculateHHI(marketShares: number[]): HHIResult {
  try {
    if (!marketShares || marketShares.length === 0) {
      throw new Error('Market shares array is empty');
    }

    // 将百分比转换为小数并计算平方和
    const hhi =
      marketShares.reduce((sum, share) => {
        const decimalShare = share / 100;
        return sum + Math.pow(decimalShare, 2);
      }, 0) * 10000;

    // 计算 CR4 (前4大企业集中度)
    const sortedShares = [...marketShares].sort((a, b) => b - a);
    const cr4 = sortedShares.slice(0, 4).reduce((sum, share) => sum + share, 0);

    // 确定风险等级
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
      level: 'low',
      description: 'calculation_error',
      concentrationRatio: 0,
    };
  }
}

/**
 * 从预言机数据计算 HHI
 *
 * @param oracleData 预言机市场数据
 * @returns HHI 计算结果
 */
export function calculateHHIFromOracles(oracleData: OracleMarketData[]): HHIResult {
  const shares = oracleData.map((o) => o.share);
  return calculateHHI(shares);
}

/**
 * 计算多元化评分
 * 基于链多样性、协议多样性和资产多样性的综合评分
 *
 * @param params 多元化参数
 * @returns 多元化评分结果
 */
export function calculateDiversificationScore(params: {
  chainCount: number;
  totalChains: number;
  protocolCount: number;
  totalProtocols: number;
  assetCount: number;
  totalAssets: number;
  entropy?: number; // 熵值 (可选)
}): DiversificationResult {
  try {
    const { chainCount, totalChains, protocolCount, totalProtocols, assetCount, totalAssets } =
      params;

    // 计算各维度得分 (0-100)
    const chainDiversity = Math.min((chainCount / Math.max(totalChains * 0.5, 1)) * 100, 100);
    const protocolDiversity = Math.min(
      (protocolCount / Math.max(totalProtocols * 0.3, 1)) * 100,
      100
    );
    const assetDiversity = Math.min((assetCount / Math.max(totalAssets * 0.5, 1)) * 100, 100);

    // 加权平均
    const score = Math.round(chainDiversity * 0.3 + protocolDiversity * 0.4 + assetDiversity * 0.3);

    // 确定风险等级 (分数越高风险越低)
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
 * 计算波动率指数
 * 基于价格数据的标准差计算
 *
 * @param priceHistory 价格历史数据
 * @returns 波动率指数结果
 */
export function calculateVolatilityIndex(priceHistory: number[]): VolatilityResult {
  try {
    if (priceHistory.length < 2) {
      throw new Error('Insufficient price history data');
    }

    // 计算对数收益率
    const returns: number[] = [];
    for (let i = 1; i < priceHistory.length; i++) {
      // 添加除零检查
      if (priceHistory[i] > 0 && priceHistory[i - 1] > 0) {
        const logReturn = Math.log(priceHistory[i] / priceHistory[i - 1]);
        returns.push(logReturn);
      }
    }

    if (returns.length === 0) {
      throw new Error('Unable to calculate returns from price history');
    }

    // 计算平均收益率
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // 计算方差
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;

    // 日波动率 (标准差)
    const dailyVolatility = Math.sqrt(variance);

    // 年化波动率 (假设 365 天)
    const annualizedVolatility = dailyVolatility * Math.sqrt(365);

    // 转换为指数 (0-100)
    const index = Math.min(Math.round(annualizedVolatility * 100), 100);

    // 确定风险等级
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
      level: 'low',
      description: 'calculation_error',
      annualizedVolatility: 0,
      dailyVolatility: 0,
    };
  }
}

/**
 * 计算相关性风险
 * 基于相关系数矩阵评估系统性风险
 *
 * @param correlationMatrix 相关系数矩阵
 * @param oracleNames 预言机名称数组
 * @returns 相关性风险评估结果
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

    // 计算平均相关系数 (只计算上三角)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const corr = Math.abs(correlationMatrix[i][j]);
        totalCorrelation += corr;
        pairCount++;

        // 记录高相关性对 (>0.8)
        if (corr > 0.8) {
          highCorrelationPairs.push(
            `${oracleNames[i]} - ${oracleNames[j]} (${(corr * 100).toFixed(1)}%)`
          );
        }
      }
    }

    const avgCorrelation = pairCount > 0 ? totalCorrelation / pairCount : 0;

    // 转换为风险评分 (0-100)，相关性越高风险越高
    const score = Math.round(avgCorrelation * 100);

    // 确定风险等级
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
      highCorrelationPairs: highCorrelationPairs.slice(0, 5), // 最多返回5个
    };
  } catch (error) {
    logger.error(
      'Failed to calculate correlation risk',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      score: 0,
      level: 'low',
      description: 'calculation_error',
      avgCorrelation: 0,
      highCorrelationPairs: [],
    };
  }
}

/**
 * 计算综合风险指标
 *
 * @param oracleData 预言机市场数据
 * @param priceHistory 价格历史数据
 * @param correlationMatrix 相关系数矩阵
 * @returns 综合风险指标
 */
export function calculateRiskMetrics(
  oracleData: OracleMarketData[],
  priceHistory: number[],
  correlationMatrix: number[][]
): RiskMetrics {
  try {
    // 计算 HHI
    const hhi = calculateHHIFromOracles(oracleData);

    // 计算多元化评分
    const totalChains = safeMax(oracleData.map((o) => o.chains));
    const totalProtocols = oracleData.reduce((sum, o) => sum + o.protocols, 0);
    const diversification = calculateDiversificationScore({
      chainCount: oracleData.reduce((sum, o) => sum + o.chains, 0),
      totalChains: totalChains * oracleData.length,
      protocolCount: totalProtocols,
      totalProtocols: totalProtocols * 2, // 假设还有一倍的潜力
      assetCount: oracleData.length * 10, // 估算
      totalAssets: 100, // 假设总资产品种
    });

    // 计算波动率
    const volatility = calculateVolatilityIndex(priceHistory);

    // 计算相关性风险
    const oracleNames = oracleData.map((o) => o.name);
    const correlationRisk = calculateCorrelationRisk(correlationMatrix, oracleNames);

    // 计算综合风险评分 (加权平均)
    // HHI 权重 30%，多元化 25%，波动率 25%，相关性 20%
    const weights = {
      hhi: 0.3,
      diversification: 0.25,
      volatility: 0.25,
      correlation: 0.2,
    };

    // 标准化各指标到 0-100
    // HHI 范围是 0-10000，需要除以 100 得到 0-100 的分数
    // 但 HHI 越高风险越高，所以直接使用 hhi.value / 100
    const hhiScore = Math.min((hhi.value / 10000) * 100, 100); // HHI 标准化到 0-100
    const divScore = 100 - diversification.score; // 多元化越低风险越高
    const volScore = volatility.index;
    const corrScore = correlationRisk.score;

    const overallScore = Math.round(
      hhiScore * weights.hhi +
        divScore * weights.diversification +
        volScore * weights.volatility +
        corrScore * weights.correlation
    );

    // 确定综合风险等级
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

    // 返回默认结果
    return {
      hhi: {
        value: 0,
        level: 'low',
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
        level: 'low',
        description: 'calculation_error',
        annualizedVolatility: 0,
        dailyVolatility: 0,
      },
      correlationRisk: {
        score: 0,
        level: 'low',
        description: 'calculation_error',
        avgCorrelation: 0,
        highCorrelationPairs: [],
      },
      overallRisk: {
        score: 0,
        level: 'low',
        timestamp: Date.now(),
      },
    };
  }
}

/**
 * 获取风险等级颜色
 *
 * @param level 风险等级
 * @returns 颜色代码
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
 * 获取风险等级文本
 *
 * @param level 风险等级
 * @returns 本地化文本键
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
