import {
  detectPriceAnomalies,
  detectTrendBreak,
  detectVolatilityAnomalies,
} from '@/lib/analytics/anomalyDetection';
import {
  type OracleMarketData,
  type AssetData,
  type AnomalyData,
} from '@/lib/services/marketData/types';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('marketData:anomalyCalculations');

export async function detectAnomalies(
  _oracleData: OracleMarketData[],
  assetData: AssetData[],
  pricesMap?: Map<string, { prices: number[]; timestamps: number[] }>
): Promise<AnomalyData[] | null> {
  try {
    logger.info('Detecting market anomalies...');

    if (!pricesMap || pricesMap.size === 0) {
      logger.warn('No price data provided for anomaly detection');
      return null;
    }

    const allAnomalies: AnomalyData[] = [];

    assetData.forEach((asset) => {
      const assetPriceData = pricesMap.get(asset.symbol);
      if (!assetPriceData || assetPriceData.prices.length === 0) {
        return;
      }

      const { prices, timestamps } = assetPriceData;

      const priceAnomalies = detectPriceAnomalies(prices, timestamps, asset.symbol);
      allAnomalies.push(...priceAnomalies);

      const { anomalies: trendAnomalies } = detectTrendBreak(prices, timestamps);
      allAnomalies.push(...trendAnomalies);

      const volatilityAnomalies = detectVolatilityAnomalies(prices, timestamps);
      allAnomalies.push(...volatilityAnomalies);
    });

    allAnomalies.sort((a, b) => b.timestamp - a.timestamp);

    const limitedAnomalies = allAnomalies.slice(0, 20);

    logger.info(`Detected ${limitedAnomalies.length} anomalies`);
    return limitedAnomalies;
  } catch (error) {
    logger.error(
      'Failed to detect anomalies',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}
