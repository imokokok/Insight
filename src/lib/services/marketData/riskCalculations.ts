import {
  calculateRiskMetrics,
  calculateHHIFromOracles,
  calculateDiversificationScore,
} from '@/lib/analytics/riskMetrics';
import { type OracleMarketData, type RiskMetrics } from '@/lib/services/marketData/types';
import { safeMax } from '@/lib/utils';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('marketData:riskCalculations');

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

/**
 * 计算 Spearman 秩相关系数
 * 对异常值更鲁棒，适合非线性关系
 *
 * @param x 第一个数据数组
 * @param y 第二个数据数组
 * @returns Spearman 相关系数 (-1 到 1)
 */
function calculateSpearmanCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  // 计算秩次
  const getRanks = (data: number[]): number[] => {
    const indexed = data.map((value, index) => ({ value, index }));
    indexed.sort((a, b) => a.value - b.value);

    const ranks = new Array(data.length);
    for (let i = 0; i < indexed.length; i++) {
      // 处理相同值（取平均秩次）
      let j = i;
      while (j < indexed.length - 1 && indexed[j + 1].value === indexed[i].value) {
        j++;
      }

      const avgRank = (i + j) / 2 + 1; // +1 因为秩次从 1 开始
      for (let k = i; k <= j; k++) {
        ranks[indexed[k].index] = avgRank;
      }
      i = j;
    }
    return ranks;
  };

  const xRanks = getRanks(x.slice(0, n));
  const yRanks = getRanks(y.slice(0, n));

  // 计算秩次的皮尔逊相关系数
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

/**
 * 计算综合相关系数
 * 结合皮尔逊和斯皮尔曼相关系数，提供更稳健的相关性度量
 */
function calculateRobustCorrelation(x: number[], y: number[]): number {
  const pearson = calculatePearsonCorrelation(x, y);
  const spearman = calculateSpearmanCorrelation(x, y);

  // 如果两个系数差异很大，可能说明存在异常值或非线性关系
  // 使用斯皮尔曼的权重更大，因为它更鲁棒
  const diff = Math.abs(pearson - spearman);
  if (diff > 0.3) {
    // 差异较大时，主要使用斯皮尔曼
    return spearman * 0.7 + pearson * 0.3;
  }

  // 差异较小时，取平均值
  return (pearson + spearman) / 2;
}

function buildCorrelationMatrix(
  priceHistories: Map<string, number[]>,
  useRobust: boolean = true
): {
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
      const correlation = useRobust
        ? calculateRobustCorrelation(x, y)
        : calculatePearsonCorrelation(x, y);
      matrix[i][j] = correlation;
      matrix[j][i] = correlation;
    }
  }

  return { matrix, names };
}

export async function fetchRiskMetrics(
  oracleData: OracleMarketData[],
  priceHistory?: number[],
  priceHistories?: Map<string, number[]>
): Promise<RiskMetrics | null> {
  try {
    logger.info('Fetching risk metrics...');

    if (!priceHistory || priceHistory.length < 2) {
      logger.warn('Insufficient price history data for risk metrics calculation');
      return null;
    }

    const correlationInput = priceHistories ?? new Map<string, number[]>();
    if (correlationInput.size === 0) {
      logger.warn(
        'No individual price histories available; returning null instead of synthetic correlation data'
      );
      return null;
    }

    const { matrix: correlationMatrix, names: oracleNames } =
      buildCorrelationMatrix(correlationInput);

    const oracleDataForCalc =
      oracleData.length > 0
        ? oracleData
        : oracleNames.map((name) => ({
            name,
            share: 100 / oracleNames.length,
            color: '#888888',
            tvs: '$0',
            tvsValue: 0,
            chains: 1,
            protocols: 1,
            avgLatency: 0,
            accuracy: 0,
            updateFrequency: 0,
            change24h: 0,
            change7d: 0,
            change30d: 0,
          }));

    const riskMetrics = calculateRiskMetrics(oracleDataForCalc, priceHistory, correlationMatrix);

    logger.info('Risk metrics calculated successfully');
    return riskMetrics;
  } catch (error) {
    logger.error(
      'Failed to fetch risk metrics',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function fetchHHI(oracleData: OracleMarketData[]) {
  try {
    logger.info('Calculating HHI...');
    return calculateHHIFromOracles(oracleData);
  } catch (error) {
    logger.error(
      'Failed to calculate HHI',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      value: 0,
      level: 'low' as const,
      description: 'calculation_error',
      concentrationRatio: 0,
    };
  }
}

export async function fetchDiversificationScore(oracleData: OracleMarketData[]) {
  try {
    logger.info('Calculating diversification score...');

    if (!oracleData || oracleData.length === 0) {
      throw new Error('Oracle data is empty');
    }

    const totalChains = safeMax(oracleData.map((o) => o.chains));
    const totalProtocols = oracleData.reduce((sum, o) => sum + o.protocols, 0);

    return calculateDiversificationScore({
      chainCount: oracleData.reduce((sum, o) => sum + o.chains, 0),
      totalChains: totalChains * oracleData.length,
      protocolCount: totalProtocols,
      totalProtocols: totalProtocols * 2,
      assetCount: oracleData.length * 10,
      totalAssets: 100,
    });
  } catch (error) {
    logger.error(
      'Failed to calculate diversification score',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      score: 0,
      level: 'critical' as const,
      description: 'calculation_error',
      factors: {
        chainDiversity: 0,
        protocolDiversity: 0,
        assetDiversity: 0,
      },
    };
  }
}
