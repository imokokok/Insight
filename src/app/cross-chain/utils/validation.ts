/**
 * @fileoverview Price data validation utility functions
 * Provides price data validity checking functionality
 */

import { createLogger } from '@/lib/utils/logger';
import { type Blockchain, type PriceData } from '@/types/oracle';
import type { ValidationResult } from '@/types/oracle/constants';

const logger = createLogger('validation');

const BITCOIN_GENESIS_TIMESTAMP = new Date('2009-01-03').getTime();

export function validatePriceData(
  price: number,
  timestamp: number,
  chain: Blockchain
): ValidationResult {
  const errors: string[] = [];

  if (typeof price !== 'number' || isNaN(price)) {
    errors.push(`[${chain}] Price is not a valid number: ${price}`);
  }

  if (price === Infinity || price === -Infinity) {
    errors.push(`[${chain}] Price is Infinity`);
  }

  if (price < 0) {
    errors.push(`[${chain}] Price is negative: ${price}`);
  }

  const now = Date.now();
  const oneHourInMs = 60 * 60 * 1000;

  if (timestamp < BITCOIN_GENESIS_TIMESTAMP) {
    errors.push(
      `[${chain}] Timestamp is before Bitcoin genesis: ${new Date(timestamp).toISOString()}`
    );
  }

  if (timestamp > now + oneHourInMs) {
    errors.push(
      `[${chain}] Timestamp is more than 1 hour in the future: ${new Date(timestamp).toISOString()}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateCurrentPrices(prices: PriceData[]): PriceData[] {
  return prices.filter((priceData) => {
    if (!priceData.chain) return false;
    const validation = validatePriceData(priceData.price, priceData.timestamp, priceData.chain);
    if (!validation.isValid) {
      validation.errors.forEach((error) =>
        logger.warn('Price data validation failed', { error, chain: priceData.chain })
      );
      return false;
    }
    return true;
  });
}

export function validateHistoricalPrices(prices: PriceData[], chain: Blockchain): PriceData[] {
  return prices.filter((priceData) => {
    const validation = validatePriceData(priceData.price, priceData.timestamp, chain);
    if (!validation.isValid) {
      validation.errors.forEach((error) =>
        logger.warn('Historical price data validation failed', { error, chain })
      );
      return false;
    }
    return true;
  });
}

export function validateSinglePrice(
  price: number,
  timestamp: number,
  chain: Blockchain
): ValidationResult {
  return validatePriceData(price, timestamp, chain);
}
