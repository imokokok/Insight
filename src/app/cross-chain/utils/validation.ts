import { type PriceData } from '@/types/oracle';

export function validateCurrentPrices(prices: PriceData[]): PriceData[] {
  return prices.filter((price) => {
    if (!price.chain) return false;
    if (typeof price.price !== 'number' || isNaN(price.price) || price.price <= 0) return false;
    if (!price.timestamp || price.timestamp <= 0) return false;
    return true;
  });
}
