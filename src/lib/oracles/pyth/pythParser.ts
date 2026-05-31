import { buildApiVerification } from '@/lib/oracles/utils/verificationUtils';
import { OracleProvider } from '@/types/oracle';
import type { PriceData, ConfidenceInterval } from '@/types/oracle';
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

import type { PythPriceRaw } from './types';

const USD_QUOTE_FOREX = new Set([
  'USD/JPY',
  'USD/CHF',
  'USD/CAD',
  'USD/SGD',
  'USD/HKD',
  'USD/KRW',
  'USD/INR',
  'USD/MXN',
  'USD/BRL',
  'USD/SEK',
  'USD/NOK',
  'USD/PHP',
  'USD/IDR',
  'USD/TRY',
  'USD/ZAR',
]);

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
  const score = Math.max(0, Math.min(1, 1 - ratio * 100));
  return Number(score.toFixed(4));
}

export function parsePythPrice(
  pythPrice: PythPriceRaw,
  symbol: string,
  priceId?: string,
  pythPairFormat?: string
): PriceData | null {
  const priceValue =
    typeof pythPrice.price === 'string' ? Number(pythPrice.price) : pythPrice.price;
  if (!Number.isFinite(priceValue)) {
    return null;
  }
  const exponent = pythPrice.expo ?? -8;
  let price = priceValue * Math.pow(10, exponent);

  const confidenceValue =
    typeof pythPrice.conf === 'string' ? Number(pythPrice.conf) : (pythPrice.conf ?? 0);
  let confidenceAbsolute = confidenceValue * Math.pow(10, exponent);

  if (pythPairFormat && USD_QUOTE_FOREX.has(pythPairFormat) && price !== 0) {
    price = 1 / price;
    confidenceAbsolute =
      confidenceAbsolute /
      (priceValue * Math.pow(10, exponent) * priceValue * Math.pow(10, exponent));
  }

  const confidenceInterval = calculateConfidenceInterval(price, confidenceAbsolute);
  const publishTime = pythPrice.publish_time ?? Date.now() / 1000;
  const timestampIsEstimated = pythPrice.publish_time == null;

  return {
    provider: OracleProvider.PYTH,
    symbol: symbol.toUpperCase(),
    price,
    timestamp: publishTime * 1000,
    decimals: Math.abs(exponent),
    confidence: timestampIsEstimated
      ? Math.min(calculateConfidenceScore(confidenceAbsolute, price), 0.45)
      : calculateConfidenceScore(confidenceAbsolute, price),
    confidenceSource: timestampIsEstimated ? 'estimated' : 'original',
    confidenceInterval,
    change24h: 0,
    change24hPercent: 0,
    priceId,
    exponent,
    conf: confidenceAbsolute,
    publishTime: publishTime * 1000,
    ingestionTimestamp: Date.now(),
    metadataFallback: timestampIsEstimated || undefined,
    failureMode: timestampIsEstimated ? FailureMode.FALLBACK_METADATA : FailureMode.NONE,
    signalVector: buildSignalVector({
      dataAgeSeconds: timestampIsEstimated ? 999 : Math.floor(Date.now() / 1000 - publishTime),
      isOnChain: false,
      hasVerification: !!priceId,
      providerUptime: 99,
      hasConfidence: true,
      hasTimestamp: !timestampIsEstimated,
      hasDecimals: exponent !== undefined,
      hasSource: !!priceId,
      verificationMethod: 'getLatestPriceUpdates',
    }),
    ...(priceId
      ? {
          verification: buildApiVerification(
            `https://hermes.pyth.network/v2/updates/price/${priceId}`,
            'getLatestPriceUpdates',
            'Pyth Hermes'
          ),
        }
      : {}),
  };
}
