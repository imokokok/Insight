import { type PriceData, type Blockchain } from '@/types/oracle';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCurrentPrices(prices: PriceData[]): PriceData[] {
  return prices.filter((price) => {
    if (!price.chain) return false;
    if (typeof price.price !== 'number' || isNaN(price.price) || price.price <= 0) return false;
    if (!price.timestamp || price.timestamp <= 0) return false;
    return true;
  });
}

export function validateChainSupport(
  chains: Blockchain[],
  supportedChains: Blockchain[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const unsupportedChains = chains.filter((chain) => !supportedChains.includes(chain));
  if (unsupportedChains.length > 0) {
    errors.push(`Unsupported chains: ${unsupportedChains.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validatePriceConsistency(prices: PriceData[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (prices.length < 2) {
    warnings.push('Need at least 2 price sources for consistency check');
    return { isValid: true, errors, warnings };
  }

  const priceValues = prices.map((p) => p.price);
  const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
  const maxDeviation = Math.max(
    ...priceValues.map((p) => Math.abs((p - avgPrice) / avgPrice) * 100)
  );

  if (maxDeviation > 5) {
    warnings.push(`High price deviation detected: ${maxDeviation.toFixed(2)}%`);
  }

  return {
    isValid: true,
    errors,
    warnings,
  };
}
