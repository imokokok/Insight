/**
 * @fileoverview 数据验证 Hook
 * 提供价格数据验证功能
 */

import { useCallback } from 'react';

import { type Blockchain, type PriceData } from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';

import { validatePriceData } from '../utils/validation';
import type { ValidationResult } from '@/types/oracle/constants';

const logger = createLogger('useDataValidation');

export interface UseDataValidationReturn {
  validateCurrentPrices: (prices: PriceData[]) => PriceData[];
  validateHistoricalPrices: (prices: PriceData[], chain: Blockchain) => PriceData[];
  validateSinglePrice: (price: number, timestamp: number, chain: Blockchain) => ValidationResult;
}

export function useDataValidation(): UseDataValidationReturn {
  const validateCurrentPrices = useCallback((prices: PriceData[]): PriceData[] => {
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
  }, []);

  const validateHistoricalPrices = useCallback(
    (prices: PriceData[], chain: Blockchain): PriceData[] => {
      return prices.filter((priceData) => {
        const validation = validatePriceData(priceData.price, priceData.timestamp, chain);
        if (!validation.isValid) {
          validation.errors.forEach((error) =>
            logger.warn('历史价格数据验证失败', { error, chain })
          );
          return false;
        }
        return true;
      });
    },
    []
  );

  const validateSinglePrice = useCallback(
    (price: number, timestamp: number, chain: Blockchain): ValidationResult => {
      return validatePriceData(price, timestamp, chain);
    },
    []
  );

  return {
    validateCurrentPrices,
    validateHistoricalPrices,
    validateSinglePrice,
  };
}
