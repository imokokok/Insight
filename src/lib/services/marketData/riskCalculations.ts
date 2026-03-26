import { type OracleMarketData, type RiskMetrics } from '@/app/[locale]/market-overview/types';
import {
  calculateRiskMetrics,
  calculateHHIFromOracles,
  calculateDiversificationScore,
} from '@/lib/analytics/riskMetrics';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('marketData:riskCalculations');

export async function fetchRiskMetrics(oracleData: OracleMarketData[]): Promise<RiskMetrics> {
  try {
    logger.info('Fetching risk metrics...');

    const priceHistory: number[] = [];
    let basePrice = 100;
    for (let i = 0; i < 100; i++) {
      basePrice = basePrice * (1 + (Math.random() - 0.48) * 0.02);
      priceHistory.push(basePrice);
    }

    const n = oracleData.length;
    const correlationMatrix: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      correlationMatrix[i][i] = 1;
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const correlation = 0.5 + Math.random() * 0.4;
        correlationMatrix[i][j] = correlation;
        correlationMatrix[j][i] = correlation;
      }
    }

    const riskMetrics = calculateRiskMetrics(oracleData, priceHistory, correlationMatrix);

    logger.info('Risk metrics calculated successfully');
    return riskMetrics;
  } catch (error) {
    logger.error(
      'Failed to fetch risk metrics',
      error instanceof Error ? error : new Error(String(error))
    );

    return {
      hhi: {
        value: 2500,
        level: 'medium',
        description: 'market_concentration_medium',
        concentrationRatio: 65,
      },
      diversification: {
        score: 60,
        level: 'medium',
        description: 'diversification_moderate',
        factors: {
          chainDiversity: 55,
          protocolDiversity: 65,
          assetDiversity: 60,
        },
      },
      volatility: {
        index: 35,
        level: 'medium',
        description: 'volatility_moderate',
        annualizedVolatility: 0.35,
        dailyVolatility: 0.018,
      },
      correlationRisk: {
        score: 50,
        level: 'medium',
        description: 'correlation_risk_moderate',
        avgCorrelation: 0.65,
        highCorrelationPairs: [],
      },
      overallRisk: {
        score: 45,
        level: 'medium',
        timestamp: Date.now(),
      },
    };
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

    const totalChains = Math.max(...oracleData.map((o) => o.chains));
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
