/**
 * @fileoverview 价格数据验证工具函数
 * 提供价格数据的有效性验证功能
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
    errors.push(`[${chain}] 价格不是有效数字: ${price}`);
  }

  if (price === Infinity || price === -Infinity) {
    errors.push(`[${chain}] 价格为 Infinity`);
  }

  if (price < 0) {
    errors.push(`[${chain}] 价格为负数: ${price}`);
  }

  const now = Date.now();
  const oneHourInMs = 60 * 60 * 1000;

  if (timestamp < BITCOIN_GENESIS_TIMESTAMP) {
    errors.push(`[${chain}] 时间戳早于比特币创世时间: ${new Date(timestamp).toISOString()}`);
  }

  if (timestamp > now + oneHourInMs) {
    errors.push(`[${chain}] 时间戳晚于当前时间+1小时: ${new Date(timestamp).toISOString()}`);
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
