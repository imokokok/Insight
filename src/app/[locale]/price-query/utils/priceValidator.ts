import type { PriceData } from '@/lib/oracles';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  anomalies: AnomalyInfo[];
}

export interface AnomalyInfo {
  type: 'price_spike' | 'price_drop' | 'stale_data' | 'future_timestamp' | 'gap_in_data';
  severity: 'low' | 'medium' | 'high';
  message: string;
  dataPoint?: PriceData;
}

const PRICE_CHANGE_THRESHOLD_PERCENT = 50;
const Z_SCORE_THRESHOLD = 3;
const IQR_MULTIPLIER = 1.5;
const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000;
const MAX_GAP_TOLERANCE_MS = 10 * 60 * 1000;

export function validatePrice(price: number, previousPrice?: number): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    anomalies: [],
  };

  if (typeof price !== 'number' || isNaN(price)) {
    result.isValid = false;
    result.errors.push('价格必须是有效数字');
    return result;
  }

  if (price <= 0) {
    result.isValid = false;
    result.errors.push('价格必须为正数');
    return result;
  }

  if (!isFinite(price)) {
    result.isValid = false;
    result.errors.push('价格不能为无穷大');
    return result;
  }

  if (previousPrice !== undefined && previousPrice > 0) {
    const changePercent = Math.abs(((price - previousPrice) / previousPrice) * 100);

    if (changePercent > PRICE_CHANGE_THRESHOLD_PERCENT) {
      const anomalyType = price > previousPrice ? 'price_spike' : 'price_drop';
      const severity = changePercent > 100 ? 'high' : changePercent > 75 ? 'medium' : 'low';

      result.anomalies.push({
        type: anomalyType,
        severity,
        message: `价格在短时间内变化 ${changePercent.toFixed(2)}%，超过阈值 ${PRICE_CHANGE_THRESHOLD_PERCENT}%`,
      });

      result.warnings.push(`检测到异常价格变化: ${changePercent.toFixed(2)}%`);
    }
  }

  return result;
}

export function validateTimestamp(timestamp: number, maxAge?: number): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    anomalies: [],
  };

  if (typeof timestamp !== 'number' || isNaN(timestamp)) {
    result.isValid = false;
    result.errors.push('时间戳必须是有效数字');
    return result;
  }

  const now = Date.now();
  const maxAgeMs = maxAge ?? DEFAULT_MAX_AGE_MS;

  if (timestamp > now) {
    result.isValid = false;
    result.errors.push('时间戳不能在未来');
    result.anomalies.push({
      type: 'future_timestamp',
      severity: 'high',
      message: `时间戳 ${new Date(timestamp).toISOString()} 在当前时间之后`,
    });
    return result;
  }

  const age = now - timestamp;
  if (age > maxAgeMs) {
    const ageMinutes = Math.floor(age / 60000);
    result.warnings.push(`数据已过期，距今 ${ageMinutes} 分钟`);
    result.anomalies.push({
      type: 'stale_data',
      severity: age > maxAgeMs * 3 ? 'high' : age > maxAgeMs * 2 ? 'medium' : 'low',
      message: `数据距今已 ${ageMinutes} 分钟，超过最大有效期 ${Math.floor(maxAgeMs / 60000)} 分钟`,
    });
  }

  return result;
}

export function validateTimeSeries(data: PriceData[]): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    anomalies: [],
  };

  if (!Array.isArray(data)) {
    result.isValid = false;
    result.errors.push('数据必须是数组');
    return result;
  }

  if (data.length === 0) {
    result.warnings.push('时间序列数据为空');
    return result;
  }

  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sortedData.length; i++) {
    const priceValidation = validatePrice(sortedData[i].price);
    if (!priceValidation.isValid) {
      result.errors.push(...priceValidation.errors.map((e) => `[索引 ${i}] ${e}`));
      result.isValid = false;
    }

    const timestampValidation = validateTimestamp(sortedData[i].timestamp);
    if (!timestampValidation.isValid) {
      result.errors.push(...timestampValidation.errors.map((e) => `[索引 ${i}] ${e}`));
      result.isValid = false;
    }
    result.anomalies.push(
      ...timestampValidation.anomalies.map((a) => ({
        ...a,
        dataPoint: sortedData[i],
      }))
    );
  }

  for (let i = 1; i < sortedData.length; i++) {
    const prevTimestamp = sortedData[i - 1].timestamp;
    const currTimestamp = sortedData[i].timestamp;
    const gap = currTimestamp - prevTimestamp;

    if (gap > MAX_GAP_TOLERANCE_MS) {
      const gapMinutes = Math.floor(gap / 60000);
      result.anomalies.push({
        type: 'gap_in_data',
        severity:
          gap > MAX_GAP_TOLERANCE_MS * 6
            ? 'high'
            : gap > MAX_GAP_TOLERANCE_MS * 3
              ? 'medium'
              : 'low',
        message: `时间序列存在 ${gapMinutes} 分钟的数据间隙`,
        dataPoint: sortedData[i],
      });
      result.warnings.push(`检测到数据间隙: ${gapMinutes} 分钟`);
    }

    const priceValidation = validatePrice(sortedData[i].price, sortedData[i - 1].price);
    result.anomalies.push(
      ...priceValidation.anomalies.map((a) => ({
        ...a,
        dataPoint: sortedData[i],
      }))
    );
    result.warnings.push(...priceValidation.warnings);
  }

  return result;
}

export function detectAnomalies(prices: number[]): number[] {
  if (!Array.isArray(prices) || prices.length < 4) {
    return [];
  }

  const validPrices = prices.filter(
    (p) => typeof p === 'number' && !isNaN(p) && isFinite(p) && p > 0
  );

  if (validPrices.length < 4) {
    return [];
  }

  const anomalyIndices: number[] = [];

  const iqrAnomalies = detectAnomaliesByIQR(validPrices);
  const zScoreAnomalies = detectAnomaliesByZScore(validPrices);

  const anomalySet = new Set([...iqrAnomalies, ...zScoreAnomalies]);

  let validIndex = 0;
  for (let i = 0; i < prices.length; i++) {
    if (
      typeof prices[i] === 'number' &&
      !isNaN(prices[i]) &&
      isFinite(prices[i]) &&
      prices[i] > 0
    ) {
      if (anomalySet.has(validIndex)) {
        anomalyIndices.push(i);
      }
      validIndex++;
    }
  }

  return anomalyIndices;
}

function detectAnomaliesByIQR(prices: number[]): number[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const n = sorted.length;

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);

  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - IQR_MULTIPLIER * iqr;
  const upperBound = q3 + IQR_MULTIPLIER * iqr;

  const anomalyIndices: number[] = [];
  prices.forEach((price, index) => {
    if (price < lowerBound || price > upperBound) {
      anomalyIndices.push(index);
    }
  });

  return anomalyIndices;
}

function detectAnomaliesByZScore(prices: number[]): number[] {
  const n = prices.length;
  const mean = prices.reduce((sum, p) => sum + p, 0) / n;

  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return [];
  }

  const anomalyIndices: number[] = [];
  prices.forEach((price, index) => {
    const zScore = Math.abs((price - mean) / stdDev);
    if (zScore > Z_SCORE_THRESHOLD) {
      anomalyIndices.push(index);
    }
  });

  return anomalyIndices;
}

export function calculatePriceStatistics(prices: number[]): {
  mean: number;
  median: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
} | null {
  const validPrices = prices.filter(
    (p) => typeof p === 'number' && !isNaN(p) && isFinite(p) && p > 0
  );

  if (validPrices.length === 0) {
    return null;
  }

  const sorted = [...validPrices].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = validPrices.reduce((sum, p) => sum + p, 0) / n;

  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  const variance = validPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  return { mean, median, stdDev, q1, q3, iqr };
}

export function isPriceWithinBounds(
  price: number,
  lowerBound: number,
  upperBound: number
): boolean {
  return price >= lowerBound && price <= upperBound;
}

export function getPriceDeviation(
  price: number,
  referencePrice: number
): {
  absolute: number;
  percent: number;
} {
  if (referencePrice === 0) {
    return { absolute: Math.abs(price), percent: 0 };
  }

  return {
    absolute: Math.abs(price - referencePrice),
    percent: Math.abs(((price - referencePrice) / referencePrice) * 100),
  };
}
