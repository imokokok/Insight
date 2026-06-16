/**
 * @fileoverview Anomalous price detection utility functions
 * Provides IQR and standard deviation based anomalous price detection
 */

import { createLogger } from '@/lib/utils/logger';
import {
  calculateMean,
  calculatePercentile,
  calculateStandardDeviationFromVariance,
  calculateVariance,
  calculateZScore,
} from '@/lib/utils/statistics';
import {
  type AnomalousPricePoint,
  defaultThresholdConfig,
  type ThresholdConfig,
} from '@/types/crossChain';
import { type Blockchain, type PriceData } from '@/types/oracle';

export type { AnomalousPricePoint } from '@/types/crossChain';

const logger = createLogger('anomalyDetection');

function detectAnomalousPrices(
  prices: PriceData[],
  filteredChains: Blockchain[],
  thresholdConfig?: ThresholdConfig
): AnomalousPricePoint[] {
  const config = thresholdConfig ?? defaultThresholdConfig;
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

  const iqrMultiplier = config.outlierDetectionMethod === 'iqr' ? config.outlierThreshold : 3.0;
  const lowerBound = q1 - iqrMultiplier * iqr;
  const upperBound = q3 + iqrMultiplier * iqr;

  const mean = calculateMean(validPrices);
  const variance = calculateVariance(validPrices, mean);
  const stdDev = calculateStandardDeviationFromVariance(variance);

  const zScoreThreshold = config.outlierThreshold;

  const seenKeys = new Set<string>();

  prices.forEach((priceData) => {
    if (!priceData.chain || !filteredChains.includes(priceData.chain)) return;
    if (priceData.price <= 0 || !Number.isFinite(priceData.price)) return;

    const { price, timestamp, chain } = priceData;
    const anomalyKey = `${chain}-${timestamp}`;

    if (price < lowerBound || price > upperBound) {
      const deviation =
        iqr > 0
          ? Math.abs(price - (price < lowerBound ? q1 : q3)) / iqr
          : stdDev > 0
            ? Math.abs(price - mean) / stdDev
            : 0;
      if (!seenKeys.has(anomalyKey)) {
        seenKeys.add(anomalyKey);
        anomalies.push({
          chain,
          price,
          timestamp,
          reason: 'iqr_outlier',
          deviation,
        });
      }
    }

    if (stdDev > 0) {
      const zScore = Math.abs(calculateZScore(price, mean, stdDev) ?? 0);
      if (zScore > zScoreThreshold && !seenKeys.has(anomalyKey)) {
        seenKeys.add(anomalyKey);
        anomalies.push({
          chain,
          price,
          timestamp,
          reason: 'std_dev_outlier',
          deviation: zScore,
        });
      }
    }
  });

  return anomalies;
}

export function detectAnomalies(
  prices: PriceData[],
  filteredChains: Blockchain[],
  thresholdConfig?: ThresholdConfig
): AnomalousPricePoint[] {
  const anomalies = detectAnomalousPrices(prices, filteredChains, thresholdConfig);
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
