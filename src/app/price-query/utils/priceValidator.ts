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
const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000;

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
