import { type Blockchain, type PriceData } from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';
import type { ValidationResult } from '@/types/oracle/constants';

import { validatePriceData } from '../utils/validation';

const logger = createLogger('useDataValidation');

function validateCurrentPrices(prices: PriceData[]): PriceData[] {
  return prices.filter((priceData) => {
    if (!priceData.chain) return false;
    const validation = validatePriceData(priceData.price, priceData.timestamp, priceData.chain);
    if (!validation.isValid) {
      validation.errors.forEach((error) =>
        logger.warn('价格数据验证失败', { error, chain: priceData.chain })
      );
      return false;
    }
    return true;
  });
}

function validateHistoricalPrices(prices: PriceData[], chain: Blockchain): PriceData[] {
  return prices.filter((priceData) => {
    const validation = validatePriceData(priceData.price, priceData.timestamp, chain);
    if (!validation.isValid) {
      validation.errors.forEach((error) => logger.warn('历史价格数据验证失败', { error, chain }));
      return false;
    }
    return true;
  });
}

function validateSinglePrice(
  price: number,
  timestamp: number,
  chain: Blockchain
): ValidationResult {
  return validatePriceData(price, timestamp, chain);
}

export interface UseDataValidationReturn {
  validateCurrentPrices: (prices: PriceData[]) => PriceData[];
  validateHistoricalPrices: (prices: PriceData[], chain: Blockchain) => PriceData[];
  validateSinglePrice: (price: number, timestamp: number, chain: Blockchain) => ValidationResult;
}

export function useDataValidation(): UseDataValidationReturn {
  return {
    validateCurrentPrices,
    validateHistoricalPrices,
    validateSinglePrice,
  };
}
