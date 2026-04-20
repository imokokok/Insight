/**
 * @fileoverview Anomalous price detection utility functions
 * Provides IQR and standard deviation based anomalous price detection
 */

import { createLogger } from '@/lib/utils/logger';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { calculatePercentile } from './statisticsUtils';

const logger = createLogger('anomalyDetection');

export interface AnomalousPricePoint {
  chain: Blockchain;
  price: number;
  timestamp: number;
  reason: 'iqr_outlier' | 'std_dev_outlier';
  deviation: number;
}

function detectAnomalousPrices(
  prices: PriceData[],
  filteredChains: Blockchain[]
): AnomalousPricePoint[] {
  const anomalies: AnomalousPricePoint[] = [];
  const validPrices = prices
    .filter((p) => p.chain && filteredChains.includes(p.chain))
    .map((p) => p.price)
    .filter((p) => p > 0 && !isNaN(p) && isFinite(p));

  if (validPrices.length < 4) return anomalies;

  const sorted = [...validPrices].sort((a, b) => a - b);

  const q1 = calculatePercentile(sorted, 25);
  const q3 = calculatePercentile(sorted, 75);
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const mean = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  const variance =
    validPrices.length > 1
      ? validPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / (validPrices.length - 1)
      : 0;
  const stdDev = Math.sqrt(variance);

  prices.forEach((priceData) => {
    if (!priceData.chain || !filteredChains.includes(priceData.chain)) return;

    const { price, timestamp, chain } = priceData;

    if (price < lowerBound || price > upperBound) {
      const deviation =
        iqr > 0
          ? Math.abs(price - (price < lowerBound ? q1 : q3)) / iqr
          : stdDev > 0
            ? Math.abs(price - mean) / stdDev
            : 0;
      anomalies.push({
        chain,
        price,
        timestamp,
        reason: 'iqr_outlier',
        deviation,
      });
    }

    if (stdDev > 0) {
      const zScore = Math.abs((price - mean) / stdDev);
      if (zScore > 3) {
        const existingAnomaly = anomalies.find(
          (a) => a.chain === chain && a.timestamp === timestamp
        );
        if (!existingAnomaly) {
          anomalies.push({
            chain,
            price,
            timestamp,
            reason: 'std_dev_outlier',
            deviation: zScore,
          });
        }
      }
    }
  });

  return anomalies;
}

export function detectAnomalies(
  prices: PriceData[],
  filteredChains: Blockchain[]
): AnomalousPricePoint[] {
  const anomalies = detectAnomalousPrices(prices, filteredChains);
  if (anomalies.length > 0) {
    logger.info(`Detected ${anomalies.length} anomalous price points`, {
      anomalies: anomalies.map((a) => ({
        chain: a.chain,
        price: a.price,
        reason: a.reason,
        deviation: a.deviation.toFixed(2),
      })),
    });
  }
  return anomalies;
}
