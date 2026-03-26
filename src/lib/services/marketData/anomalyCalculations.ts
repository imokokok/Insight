import {
  type OracleMarketData,
  type AssetData,
  type AnomalyData,
} from '@/app/[locale]/market-overview/types';
import {
  detectPriceAnomalies,
  detectTrendBreak,
  detectVolatilityAnomalies,
} from '@/lib/analytics/anomalyDetection';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('marketData:anomalyCalculations');

export async function detectAnomalies(
  oracleData: OracleMarketData[],
  assetData: AssetData[]
): Promise<AnomalyData[]> {
  try {
    logger.info('Detecting market anomalies...');

    const allAnomalies: AnomalyData[] = [];

    assetData.forEach((asset) => {
      const prices: number[] = [];
      const timestamps: number[] = [];
      let basePrice = asset.price;
      const now = Date.now();

      for (let i = 100; i >= 0; i--) {
        const timestamp = now - i * 3600000;
        basePrice = basePrice * (1 + (Math.random() - 0.48 + asset.change24h / 2400) * 0.02);
        prices.push(basePrice);
        timestamps.push(timestamp);
      }

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
    return [];
  }
}
