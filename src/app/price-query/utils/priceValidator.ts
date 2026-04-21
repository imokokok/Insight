import type { PriceData } from '@/types/oracle';
import type { ValidationResult } from '@/types/oracle/constants';

export interface AnomalyInfo {
  type: 'price_spike' | 'price_drop' | 'stale_data' | 'future_timestamp' | 'gap_in_data';
  severity: 'low' | 'medium' | 'high';
  message: string;
  code: string;
  dataPoint?: PriceData;
}

interface PriceValidationResult extends ValidationResult {
  warnings: string[];
  anomalies: AnomalyInfo[];
}

const PRICE_CHANGE_THRESHOLD_PERCENT = 50;
const Z_SCORE_THRESHOLD = 3;
const IQR_MULTIPLIER = 1.5;
const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000;
const MAX_GAP_TOLERANCE_MS = 10 * 60 * 1000;

const SYMBOL_PRICE_RANGES: Record<string, { min: number; max: number }> = {
  BTC: { min: 1000, max: 500000 },
  ETH: { min: 100, max: 50000 },
  SOL: { min: 1, max: 2000 },
  PYTH: { min: 0.01, max: 20 },
  USDC: { min: 0.5, max: 2.0 },
  USDT: { min: 0.5, max: 2.0 },
  DAI: { min: 0.5, max: 2.0 },
  ARB: { min: 0.1, max: 100 },
  OP: { min: 0.1, max: 100 },
  MATIC: { min: 0.01, max: 20 },
  AVAX: { min: 1, max: 1000 },
  BNB: { min: 10, max: 5000 },
  LINK: { min: 1, max: 500 },
  UNI: { min: 1, max: 200 },
  AAVE: { min: 10, max: 2000 },
  MKR: { min: 100, max: 20000 },
  SNX: { min: 0.1, max: 100 },
  COMP: { min: 10, max: 1000 },
  YFI: { min: 1000, max: 200000 },
  CRV: { min: 0.01, max: 20 },
};

const DEFAULT_PRICE_RANGE = { min: 0.0001, max: 1000000 };

export function validatePrice(
  price: number,
  previousPrice?: number,
  symbol?: string
): PriceValidationResult {
  const result: PriceValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    anomalies: [],
  };

  if (typeof price !== 'number' || isNaN(price)) {
    result.isValid = false;
    result.errors.push('PRICE_INVALID_NUMBER');
    return result;
  }

  if (price <= 0) {
    result.isValid = false;
    result.errors.push('PRICE_MUST_BE_POSITIVE');
    return result;
  }

  if (!isFinite(price)) {
    result.isValid = false;
    result.errors.push('PRICE_MUST_BE_FINITE');
    return result;
  }

  if (symbol) {
    const upperSymbol = symbol.toUpperCase();
    const range = SYMBOL_PRICE_RANGES[upperSymbol] ?? DEFAULT_PRICE_RANGE;

    if (price < range.min || price > range.max) {
      result.isValid = false;
      result.errors.push(`PRICE_OUT_OF_RANGE:${upperSymbol}:${price}:${range.min}:${range.max}`);
      result.anomalies.push({
        type: price > range.max ? 'price_spike' : 'price_drop',
        severity: 'high',
        message: `Price ${price} is out of ${upperSymbol} valid range [${range.min}, ${range.max}]`,
        code: price > range.max ? 'PRICE_SPIKE' : 'PRICE_DROP',
      });
      return result;
    }
  }

  if (previousPrice !== undefined && previousPrice > 0) {
    const changePercent = Math.abs(((price - previousPrice) / previousPrice) * 100);

    if (changePercent > PRICE_CHANGE_THRESHOLD_PERCENT) {
      const anomalyType = price > previousPrice ? 'price_spike' : 'price_drop';
      const severity = changePercent > 100 ? 'high' : changePercent > 75 ? 'medium' : 'low';

      result.anomalies.push({
        type: anomalyType,
        severity,
        message: `Price changed ${changePercent.toFixed(2)}% in short time, exceeding threshold ${PRICE_CHANGE_THRESHOLD_PERCENT}%`,
        code: anomalyType === 'price_spike' ? 'PRICE_SPIKE' : 'PRICE_DROP',
      });

      result.warnings.push(`PRICE_CHANGE_DETECTED:${changePercent.toFixed(2)}%`);
    }
  }

  return result;
}

export function validateTimestamp(timestamp: number, maxAge?: number): PriceValidationResult {
  const result: PriceValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    anomalies: [],
  };

  if (typeof timestamp !== 'number' || isNaN(timestamp)) {
    result.isValid = false;
    result.errors.push('TIMESTAMP_INVALID_NUMBER');
    return result;
  }

  const now = Date.now();
  const maxAgeMs = maxAge ?? DEFAULT_MAX_AGE_MS;

  if (timestamp > now) {
    result.isValid = false;
    result.errors.push('TIMESTAMP_IN_FUTURE');
    result.anomalies.push({
      type: 'future_timestamp',
      severity: 'high',
      message: `Timestamp ${new Date(timestamp).toISOString()} is in the future`,
      code: 'FUTURE_TIMESTAMP',
    });
    return result;
  }

  const age = now - timestamp;
  if (age > maxAgeMs) {
    const ageMinutes = Math.floor(age / 60000);
    result.warnings.push(`STALE_DATA:${ageMinutes}min`);
    result.anomalies.push({
      type: 'stale_data',
      severity: age >= maxAgeMs * 3 ? 'high' : age >= maxAgeMs * 2 ? 'medium' : 'low',
      message: `Data is ${ageMinutes} minutes old, exceeding max age of ${Math.floor(maxAgeMs / 60000)} minutes`,
      code: 'STALE_DATA',
    });
  }

  return result;
}

export function validateTimeSeries(data: PriceData[]): PriceValidationResult {
  const result: PriceValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    anomalies: [],
  };

  if (!Array.isArray(data)) {
    result.isValid = false;
    result.errors.push('TIMESERIES_MUST_BE_ARRAY');
    return result;
  }

  if (data.length === 0) {
    result.warnings.push('TIMESERIES_EMPTY');
    return result;
  }

  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sortedData.length; i++) {
    const priceValidation = validatePrice(sortedData[i].price);
    if (!priceValidation.isValid) {
      result.errors.push(...priceValidation.errors.map((e) => `[Index ${i}] ${e}`));
      result.isValid = false;
    }

    const timestampValidation = validateTimestamp(sortedData[i].timestamp);
    if (!timestampValidation.isValid) {
      result.errors.push(...timestampValidation.errors.map((e) => `[Index ${i}] ${e}`));
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
        message: `Time series gap of ${gapMinutes} minutes detected`,
        code: 'GAP_IN_DATA',
        dataPoint: sortedData[i],
      });
      result.warnings.push(`GAP_IN_DATA:${gapMinutes}min`);
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
