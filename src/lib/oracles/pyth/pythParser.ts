import { OracleProvider } from '@/types/oracle';
import type { PriceData, ConfidenceInterval } from '@/types/oracle';

import type { PythPriceRaw } from './types';

export function parsePythPrice(
  pythPrice: PythPriceRaw,
  symbol: string,
  priceId?: string
): PriceData | null {
  const priceValue =
    typeof pythPrice.price === 'string' ? Number(pythPrice.price) : pythPrice.price;
  if (!Number.isFinite(priceValue)) {
    return null;
  }
  const exponent = pythPrice.expo ?? -8;
  const price = priceValue * Math.pow(10, exponent);

  const confidenceValue =
    typeof pythPrice.conf === 'string' ? Number(pythPrice.conf) : (pythPrice.conf ?? 0);
  const confidenceAbsolute = confidenceValue * Math.pow(10, exponent);

  const confidenceInterval = calculateConfidenceInterval(price, confidenceAbsolute);
  const publishTime = pythPrice.publish_time ?? Date.now() / 1000;

  return {
    provider: OracleProvider.PYTH,
    symbol: symbol.toUpperCase(),
    price,
    timestamp: publishTime * 1000,
    decimals: Math.abs(exponent),
    confidence: calculateConfidenceScore(confidenceAbsolute, price),
    confidenceSource: 'original',
    confidenceInterval,
    change24h: 0,
    change24hPercent: 0,
    priceId,
    exponent,
    conf: confidenceAbsolute,
    publishTime: publishTime * 1000,
  };
}

export function calculateConfidenceInterval(price: number, confidence: number): ConfidenceInterval {
  const halfSpread = confidence / 2;
  return {
    bid: Number((price - halfSpread).toFixed(8)),
    ask: Number((price + halfSpread).toFixed(8)),
    widthPercentage: price > 0 ? Number(((confidence / price) * 100).toFixed(4)) : 0,
  };
}

export function calculateConfidenceScore(confidence: number, price: number): number {
  if (price === 0) return 0;
  const ratio = confidence / price;
  const score = Math.max(0, Math.min(100, 100 - ratio * 10000));
  return Number(score.toFixed(2));
}
