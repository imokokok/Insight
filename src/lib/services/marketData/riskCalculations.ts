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

function buildCorrelationMatrix(priceHistories: Map<string, number[]>): {
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
      const correlation = calculatePearsonCorrelation(x, y);
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
      oracleData.forEach((oracle, index) => {
        correlationInput.set(oracle.name, priceHistory);
      });
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
