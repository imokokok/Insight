/**
 * Anomaly detection module
 *
 * Provides statistics-based anomaly detection functionality:
 * - Standard deviation (2σ) based anomaly detection
 * - Trend change detection
 * - Price movement alert
 */

import { chartColors, semanticColors } from '@/lib/config/colors';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('anomalyDetection');

const ANOMALY_DEDUP_WINDOWS = {
  PRICE: 60000,
  VOLATILITY: 300000,
} as const;

const EWMA_CONFIG = {
  LAMBDA: 0.94,
  MIN_PRICES: 20,
  MIN_LOG_RETURNS: 10,
  DEFAULT_WINDOW: 20,
} as const;

const GARCH_CONFIG = {
  OMEGA: 0.000001,
  ALPHA: 0.1,
  BETA: 0.85,
} as const;

function isDuplicateAnomaly(
  anomalies: AnomalyData[],
  timestamp: number,
  windowMs: number
): boolean {
  const lastAnomaly = anomalies[anomalies.length - 1];
  return lastAnomaly !== undefined && Math.abs(lastAnomaly.timestamp - timestamp) < windowMs;
}

/**
 * Anomaly level
 */
export type AnomalyLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Anomaly type
 */
export type AnomalyType =
  | 'price_spike' // Price spike
  | 'price_drop' // Price drop
  | 'volatility_spike' // Volatility spike
  | 'trend_break' // trend break
  | 'volume_anomaly' // Volumeanomaly
  | 'correlation_break'; // correlation break

/**
 * anomaly data
 */
export interface AnomalyData {
  id: string;
  type: AnomalyType;
  level: AnomalyLevel;
  title: string;
  description: string;
  timestamp: number;
  asset?: string;
  oracle?: string;
  value: number;
  expectedValue: number;
  deviation: number; // deviation degree (standard deviation multiplier)
  duration: number; // time (minutes)
  acknowledged: boolean;
}

/**
 * Standard deviation detectionresult
 */
interface StdDevResult {
  mean: number;
  stdDev: number;
  upperBound: number; // μ + 2σ
  lowerBound: number; // μ - 2σ
  anomalies: {
    index: number;
    value: number;
    deviation: number;
    isUpper: boolean;
  }[];
}

/**
 * result
 */
interface TrendResult {
  direction: 'up' | 'down' | 'flat';
  strength: number; // 0-100
  changePoint?: number; // index
  confidence: number; //  0-1
}

/**
 * calculateStandard deviation detection
 * useimprove Z-Score method， MAD (Median Absolute Deviation)
 * : Iglewicz & Hoaglin (1993) - useafter Z-Score anomaly
 *
 * @param data array
 * @param threshold Standard deviation multiplier threshold (default 2.5，for 99% confidence interval)
 * @returns Standard deviation detectionresult
 */
export function calculateStdDevDetection(data: number[], threshold: number = 2.5): StdDevResult {
  try {
    if (data.length < 2) {
      throw new Error('Insufficient data for standard deviation calculation');
    }

    // Calculate mean and standard deviation
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    // calculatemedianand MAD (Median Absolute Deviation) use
    const sortedData = [...data].sort((a, b) => a - b);
    const median = sortedData[Math.floor(sortedData.length / 2)];
    const mad =
      sortedData.reduce((sum, val) => sum + Math.abs(val - median), 0) / sortedData.length;

    // handle stdDev as 0 ，use MAD as
    const effectiveStdDev = stdDev === 0 ? mad * 1.4826 : stdDev; // 1.4826 is MAD tostandard deviationconvert

    if (effectiveStdDev === 0) {
      return {
        mean,
        stdDev: 0,
        upperBound: mean,
        lowerBound: mean,
        anomalies: [],
      };
    }

    // usedynamicthreshold：sampleusethreshold
    const adjustedThreshold = data.length < 30 ? threshold * 1.2 : threshold;

    // calculateondown
    const upperBound = mean + adjustedThreshold * effectiveStdDev;
    const lowerBound = mean - adjustedThreshold * effectiveStdDev;

    // anomaly - useimprove Z-Score
    const anomalies = data
      .map((value, index) => {
        // useafter Z-Score: 0.6745 * (x - median) / MAD
        const modifiedZScore = (0.6745 * (value - median)) / (mad || effectiveStdDev);
        const deviation = Math.abs(value - mean) / effectiveStdDev;

        // anomaly： Z-Score orimprove Z-Score threshold
        if (deviation > adjustedThreshold || Math.abs(modifiedZScore) > 3.5) {
          return {
            index,
            value,
            deviation: Math.max(deviation, Math.abs(modifiedZScore)),
            isUpper: value > mean,
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    logger.debug(
      `StdDev detection: mean=${mean.toFixed(4)}, stdDev=${effectiveStdDev.toFixed(4)}, anomalies=${anomalies.length}`
    );

    return {
      mean,
      stdDev: effectiveStdDev,
      upperBound,
      lowerBound,
      anomalies,
    };
  } catch (error) {
    logger.error(
      'Failed to calculate standard deviation detection',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      mean: 0,
      stdDev: 0,
      upperBound: 0,
      lowerBound: 0,
      anomalies: [],
    };
  }
}

/**
 *
 * uselogarithmicand GARCH clustering
 * : Bollinger Bands +
 *
 * @param prices history
 * @param timestamps timearray
 * @param asset name
 * @returns anomaly dataarray
 */
export function detectPriceAnomalies(
  prices: number[],
  timestamps: number[],
  asset: string
): AnomalyData[] {
  try {
    if (prices.length < EWMA_CONFIG.MIN_PRICES) {
      return [];
    }

    const anomalies: AnomalyData[] = [];

    const logReturns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > 0 && prices[i - 1] > 0) {
        const logRet = Math.log(prices[i] / prices[i - 1]) * 100;
        logReturns.push(logRet);
      }
    }

    if (logReturns.length < EWMA_CONFIG.MIN_LOG_RETURNS) return [];

    const lambda = EWMA_CONFIG.LAMBDA;
    const window = Math.min(EWMA_CONFIG.DEFAULT_WINDOW, Math.floor(logReturns.length / 2));

    for (let i = window; i < logReturns.length; i++) {
      const windowReturns = logReturns.slice(i - window, i);

      // calculate EWMA
      let ewmaVar = 0;
      let weightSum = 0;
      for (let j = 0; j < windowReturns.length; j++) {
        const weight = Math.pow(lambda, windowReturns.length - 1 - j);
        ewmaVar += weight * windowReturns[j] * windowReturns[j];
        weightSum += weight;
      }
      const ewmaVol = Math.sqrt(ewmaVar / weightSum);

      // calculatecurrent Z-Score
      const currentReturn = logReturns[i];
      const windowMean = windowReturns.reduce((a, b) => a + b, 0) / windowReturns.length;
      const zScore = ewmaVol > 0 ? (currentReturn - windowMean) / ewmaVol : 0;

      // threshold
      const absZScore = Math.abs(zScore);
      if (absZScore > 2) {
        const priceIndex = i + 1;
        const priceChange = currentReturn;

        // Anomaly typeandlevel
        let type: AnomalyType;
        let level: AnomalyLevel;

        if (priceChange > 0) {
          type = 'price_spike';
        } else {
          type = 'price_drop';
        }

        // Z-Score level
        if (absZScore > 4) level = 'critical';
        else if (absZScore > 3) level = 'high';
        else if (absZScore > 2.5) level = 'medium';
        else level = 'low';

        if (!isDuplicateAnomaly(anomalies, timestamps[priceIndex], ANOMALY_DEDUP_WINDOWS.PRICE)) {
          anomalies.push({
            id: `price-${asset}-${timestamps[priceIndex]}-${Date.now()}`,
            type,
            level,
            title: type === 'price_spike' ? 'price_spike_detected' : 'price_drop_detected',
            description: `${asset} ${type === 'price_spike' ? 'surged' : 'dropped'} ${Math.abs(priceChange).toFixed(2)}% (Z-Score: ${zScore.toFixed(2)})`,
            timestamp: timestamps[priceIndex],
            asset,
            value: prices[priceIndex],
            expectedValue: prices[priceIndex - 1] * Math.exp(windowMean / 100),
            deviation: absZScore,
            duration: 0,
            acknowledged: false,
          });
        }
      }
    }

    logger.debug(`Detected ${anomalies.length} price anomalies for ${asset}`);
    return anomalies;
  } catch (error) {
    logger.error(
      'Failed to detect price anomalies',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * trend break
 * use CUSUM (cumulativeand) algorithm
 *
 * @param data array
 * @param timestamps timearray
 * @param threshold threshold
 * @returns result
 */
export function detectTrendBreak(
  data: number[],
  timestamps: number[],
  threshold: number = 2
): { trend: TrendResult; anomalies: AnomalyData[] } {
  try {
    if (data.length < 20) {
      return {
        trend: { direction: 'flat', strength: 0, confidence: 0 },
        anomalies: [],
      };
    }

    // calculatelogarithmic
    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
      // Add division by zero check
      if (data[i] > 0 && data[i - 1] > 0) {
        returns.push(Math.log(data[i] / data[i - 1]));
      }
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    );

    // CUSUM algorithm
    let posSum = 0;
    let negSum = 0;
    const k = 0.5 * stdDev; // value
    const h = threshold * stdDev; //

    let changePoint: number | undefined;
    const anomalies: AnomalyData[] = [];

    for (let i = 0; i < returns.length; i++) {
      const x = returns[i] - mean;

      posSum = Math.max(0, posSum + x - k);
      negSum = Math.max(0, negSum - x - k);

      if (posSum > h || negSum > h) {
        changePoint = i + 1;

        // to
        const direction = posSum > h ? 'up' : 'down';

        // calculate
        const recentData = data.slice(Math.max(0, changePoint - 10), changePoint + 10);
        const trendSlope = calculateTrendSlope(recentData);
        const strength = Math.min(Math.abs(trendSlope) * 100, 100);

        anomalies.push({
          id: `trend-${changePoint}-${timestamps[changePoint]}-${Date.now()}`,
          type: 'trend_break',
          level: strength > 70 ? 'high' : strength > 40 ? 'medium' : 'low',
          title: 'trend_break_detected',
          description: `Trend changed to ${direction} with ${strength.toFixed(1)}% strength`,
          timestamp: timestamps[changePoint],
          value: data[changePoint],
          expectedValue: data[changePoint - 1],
          deviation: Math.abs(trendSlope),
          duration: 0,
          acknowledged: false,
        });

        // usenotisreset，avoid
        // 0.5 to
        posSum *= 0.5;
        negSum *= 0.5;
      }
    }

    // calculate
    const recentReturns = returns.slice(-20);
    const recentMean = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;

    let direction: 'up' | 'down' | 'flat';
    if (recentMean > 0.001) direction = 'up';
    else if (recentMean < -0.001) direction = 'down';
    else direction = 'flat';

    const trend: TrendResult = {
      direction,
      strength: Math.min(Math.abs(recentMean) * 1000, 100),
      changePoint,
      confidence: changePoint ? 0.85 : 0.7,
    };

    logger.debug(`Trend detection: direction=${direction}, anomalies=${anomalies.length}`);

    return { trend, anomalies };
  } catch (error) {
    logger.error(
      'Failed to detect trend break',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      trend: { direction: 'flat', strength: 0, confidence: 0 },
      anomalies: [],
    };
  }
}

/**
 * calculate (linearregression)
 */
function calculateTrendSlope(data: number[]): number {
  const n = data.length;
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((sum, y) => sum + y, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (data[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  return denominator !== 0 ? numerator / denominator : 0;
}

/**
 * fromtime（minutes）
 */
function inferDataIntervalMinutes(timestamps: number[]): number {
  if (timestamps.length < 2) return 5; // default5 minutes

  // calculatetime
  let totalInterval = 0;
  let count = 0;
  for (let i = 1; i < Math.min(timestamps.length, 100); i++) {
    const interval = (timestamps[i] - timestamps[i - 1]) / 60000; // convertasminutes
    if (interval > 0) {
      totalInterval += interval;
      count++;
    }
  }

  const avgInterval = count > 0 ? totalInterval / count : 5;

  // to：1, 5, 15, 30, 60, 240, 1440 minutes
  const commonIntervals = [1, 5, 15, 30, 60, 240, 1440];
  const closest = commonIntervals.reduce((prev, curr) =>
    Math.abs(curr - avgInterval) < Math.abs(prev - avgInterval) ? curr : prev
  );

  return closest;
}

/**
 * calculate
 * @param intervalMinutes （minutes）
 * @returns sqrt()
 */
function getAnnualizationFactor(intervalMinutes: number): number {
  const periodsPerYear = (365 * 24 * 60) / intervalMinutes;
  return Math.sqrt(periodsPerYear);
}

/**
 * anomaly
 * use Parkinson estimateand GARCH(1,1) clustering
 * : Parkinson (1980) - The Extreme Value Method
 *
 * @param prices history
 * @param timestamps timearray
 * @param window scroll
 * @returns anomaly dataarray
 */
export function detectVolatilityAnomalies(
  prices: number[],
  timestamps: number[],
  window: number = 20
): AnomalyData[] {
  try {
    if (prices.length < window * 2) {
      return [];
    }

    // fromtime，dynamiccalculate
    const dataIntervalMinutes = inferDataIntervalMinutes(timestamps);
    const annualizationFactor = getAnnualizationFactor(dataIntervalMinutes);

    // calculate Parkinson (use High-Low rangeestimate)
    const parkinsonVol: number[] = [];

    for (let i = window; i < prices.length; i++) {
      const windowPrices = prices.slice(i - window, i);

      // calculaterange
      const highs: number[] = [];
      const lows: number[] = [];

      for (let j = 1; j < windowPrices.length; j++) {
        const prevPrice = windowPrices[j - 1];
        const currPrice = windowPrices[j];
        // usebeforeafterasestimate
        highs.push(Math.max(prevPrice, currPrice));
        lows.push(Math.min(prevPrice, currPrice));
      }

      // Parkinson : σ² = (1/4Nln2) * Σ[ln(Hi/Li)]²
      let sumSquaredLogRange = 0;
      for (let j = 0; j < highs.length; j++) {
        if (lows[j] > 0) {
          const logRange = Math.log(highs[j] / lows[j]);
          sumSquaredLogRange += logRange * logRange;
        }
      }

      const n = highs.length;
      const parkinsonVariance = sumSquaredLogRange / (4 * n * Math.log(2));
      // usedynamiccalculate， 5 minuteshypothesis
      const annualizedVol = Math.sqrt(parkinsonVariance) * annualizationFactor * 100;
      parkinsonVol.push(annualizedVol);
    }

    if (parkinsonVol.length < EWMA_CONFIG.MIN_LOG_RETURNS) return [];

    const { OMEGA, ALPHA, BETA } = GARCH_CONFIG;

    const garchVol: number[] = [];
    let lastVar = (parkinsonVol[0] * parkinsonVol[0]) / 10000;

    for (let i = 0; i < parkinsonVol.length; i++) {
      const currentVol = parkinsonVol[i];
      const currentVar = (currentVol * currentVol) / 10000;

      const predictedVar = OMEGA + ALPHA * currentVar + BETA * lastVar;
      const predictedVol = Math.sqrt(predictedVar) * 100;

      garchVol.push(predictedVol);
      lastVar = predictedVar;
    }

    // andprediction
    const anomalies: AnomalyData[] = [];

    for (let i = window; i < parkinsonVol.length; i++) {
      const actualVol = parkinsonVol[i];
      const predictedVol = garchVol[i - 1]; // usebeforeprediction

      if (predictedVol > 0) {
        const volRatio = actualVol / predictedVol;

        if (volRatio > 1.5 || volRatio < 0.5) {
          const priceIndex = i + window;
          let level: AnomalyLevel;

          if (volRatio > 3 || volRatio < 0.33) level = 'critical';
          else if (volRatio > 2 || volRatio < 0.5) level = 'high';
          else if (volRatio > 1.5 || volRatio < 0.67) level = 'medium';
          else level = 'low';

          if (
            !isDuplicateAnomaly(anomalies, timestamps[priceIndex], ANOMALY_DEDUP_WINDOWS.VOLATILITY)
          ) {
            anomalies.push({
              id: `volatility-${timestamps[priceIndex]}-${Date.now()}`,
              type: 'volatility_spike',
              level,
              title: volRatio > 1 ? 'volatility_spike_detected' : 'volatility_drop_detected',
              description: `Volatility ${volRatio > 1 ? 'spiked' : 'dropped'} to ${actualVol.toFixed(1)}% (expected: ${predictedVol.toFixed(1)}%, ratio: ${volRatio.toFixed(2)})`,
              timestamp: timestamps[priceIndex],
              value: actualVol,
              expectedValue: predictedVol,
              deviation: volRatio,
              duration: window,
              acknowledged: false,
            });
          }
        }
      }
    }

    logger.debug(`Detected ${anomalies.length} volatility anomalies`);
    return anomalies;
  } catch (error) {
    logger.error(
      'Failed to detect volatility anomalies',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * Volumeanomaly
 *
 * @param volumes Volumehistory
 * @param timestamps timearray
 * @returns anomaly dataarray
 */
export function detectVolumeAnomalies(volumes: number[], timestamps: number[]): AnomalyData[] {
  try {
    if (volumes.length < 10) {
      return [];
    }

    const stdDevResult = calculateStdDevDetection(volumes, 2.5);
    const anomalies: AnomalyData[] = [];

    stdDevResult.anomalies.forEach((anomaly) => {
      let level: AnomalyLevel;

      if (anomaly.deviation > 5) level = 'critical';
      else if (anomaly.deviation > 4) level = 'high';
      else if (anomaly.deviation > 3) level = 'medium';
      else level = 'low';

      anomalies.push({
        id: `volume-${timestamps[anomaly.index]}-${Date.now()}`,
        type: 'volume_anomaly',
        level,
        title: anomaly.isUpper ? 'volume_spike_detected' : 'volume_drop_detected',
        description: `Volume ${anomaly.isUpper ? 'spiked' : 'dropped'} to ${anomaly.value.toFixed(0)}`,
        timestamp: timestamps[anomaly.index],
        value: anomaly.value,
        expectedValue: stdDevResult.mean,
        deviation: anomaly.deviation,
        duration: 0,
        acknowledged: false,
      });
    });

    logger.debug(`Detected ${anomalies.length} volume anomalies`);
    return anomalies;
  } catch (error) {
    logger.error(
      'Failed to detect volume anomalies',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * anomaly
 *
 * @param data
 * @returns alltoanomaly
 */
export function detectAllAnomalies(data: {
  prices: number[];
  timestamps: number[];
  volumes?: number[];
  asset?: string;
}): AnomalyData[] {
  try {
    const { prices, timestamps, volumes, asset = 'Unknown' } = data;

    const allAnomalies: AnomalyData[] = [];

    // anomaly
    const priceAnomalies = detectPriceAnomalies(prices, timestamps, asset);
    allAnomalies.push(...priceAnomalies);

    // Trend change detection
    const { anomalies: trendAnomalies } = detectTrendBreak(prices, timestamps);
    allAnomalies.push(...trendAnomalies);

    // anomaly
    const volatilityAnomalies = detectVolatilityAnomalies(prices, timestamps);
    allAnomalies.push(...volatilityAnomalies);

    // Volumeanomaly
    if (volumes && volumes.length > 0) {
      const volumeAnomalies = detectVolumeAnomalies(volumes, timestamps);
      allAnomalies.push(...volumeAnomalies);
    }

    // bytimesort
    allAnomalies.sort((a, b) => b.timestamp - a.timestamp);

    logger.info(`Total anomalies detected: ${allAnomalies.length}`);
    return allAnomalies;
  } catch (error) {
    logger.error(
      'Failed to detect all anomalies',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * getAnomaly levelcolor
 *
 * @param level Anomaly level
 * @returns colorcode
 */
export function getAnomalyLevelColor(level: AnomalyLevel): string {
  const colors: Record<AnomalyLevel, string> = {
    low: chartColors.recharts.primary,
    medium: semanticColors.warning.DEFAULT,
    high: semanticColors.danger.DEFAULT,
    critical: chartColors.oracle['pyth'],
  };
  return colors[level];
}

/**
 * getAnomaly typeicon
 *
 * @param type Anomaly type
 * @returns iconname
 */
export function getAnomalyIcon(type: AnomalyType): string {
  const icons: Record<AnomalyType, string> = {
    price_spike: 'TrendingUp',
    price_drop: 'TrendingDown',
    volatility_spike: 'Activity',
    trend_break: 'GitBranch',
    volume_anomaly: 'BarChart3',
    correlation_break: 'Unlink',
  };
  return icons[type];
}

/**
 * getAnomaly typetext
 *
 * @param type Anomaly type
 * @returns localtext
 */
export function getAnomalyTypeText(type: AnomalyType): string {
  const texts: Record<AnomalyType, string> = {
    price_spike: 'anomaly_price_spike',
    price_drop: 'anomaly_price_drop',
    volatility_spike: 'anomaly_volatility_spike',
    trend_break: 'anomaly_trend_break',
    volume_anomaly: 'anomaly_volume',
    correlation_break: 'anomaly_correlation_break',
  };
  return texts[type];
}

/**
 * filteranomaly
 *
 * @param anomalies anomalyarray
 * @returns anomaly
 */
export function getUnacknowledgedAnomalies(anomalies: AnomalyData[]): AnomalyData[] {
  return anomalies.filter((a) => !a.acknowledged);
}

/**
 * bylevelanomalycount
 *
 * @param anomalies anomalyarray
 * @returns levelcount
 */
export function countAnomaliesByLevel(anomalies: AnomalyData[]): Record<AnomalyLevel, number> {
  return anomalies.reduce(
    (acc, anomaly) => {
      acc[anomaly.level] = (acc[anomaly.level] || 0) + 1;
      return acc;
    },
    {} as Record<AnomalyLevel, number>
  );
}
