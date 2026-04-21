import { OracleProvider } from '@/types/oracle';
import type { PriceData, ConfidenceInterval } from '@/types/oracle';

import type { PublisherData, PublisherStatus, ValidatorData, PythPriceRaw } from './types';

export function parsePythPrice(
  pythPrice: PythPriceRaw,
  symbol: string,
  priceId?: string
): PriceData {
  const priceValue =
    typeof pythPrice.price === 'string' ? Number(pythPrice.price) : pythPrice.price;
  if (!Number.isFinite(priceValue)) {
    return {
      provider: OracleProvider.PYTH,
      symbol: symbol.toUpperCase(),
      price: 0,
      timestamp: Date.now(),
      decimals: 0,
      confidence: 0,
      confidenceSource: 'original',
      confidenceInterval: { bid: 0, ask: 0, widthPercentage: 0 },
      change24h: 0,
      change24hPercent: 0,
      priceId,
      exponent: 0,
      conf: 0,
      publishTime: Date.now(),
    };
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

export function parsePublishers(data: unknown): PublisherData[] {
  const publishers: PublisherData[] = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        const p = item as Record<string, unknown>;
        publishers.push({
          id: String(p.id ?? p.publisher_key ?? ''),
          name: String(p.name ?? p.publisher_key ?? 'Unknown Publisher'),
          publisherKey: String(p.publisher_key ?? ''),
          reliabilityScore: Number(p.reliability ?? p.accuracy ?? 0.95),
          latency: Number(p.latency ?? 100),
          status: parsePublisherStatus(p.status),
          submissionCount: Number(p.submission_count ?? 0),
          lastUpdate: Number(p.last_update ?? Date.now()),
          priceFeeds: Array.isArray(p.price_feeds) ? p.price_feeds.map(String) : [],
          totalSubmissions: Number(p.total_submissions ?? 0),
          averageLatency: Number(p.average_latency ?? 100),
          accuracy: Number(p.accuracy ?? p.reliability ?? 0.95) * 100,
          stake: Number(p.stake ?? 0),
        });
      }
    }
  }

  return publishers;
}

export function parsePublisherStatus(status: unknown): PublisherStatus {
  if (typeof status === 'string') {
    const s = status.toLowerCase();
    if (s === 'active' || s === 'online') return 'active';
    if (s === 'degraded' || s === 'warning') return 'degraded';
  }
  return 'inactive';
}

export function parseValidators(data: unknown): ValidatorData[] {
  const validators: ValidatorData[] = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        const v = item as Record<string, unknown>;
        validators.push({
          id: String(v.id ?? v.validator_key ?? ''),
          name: String(v.name ?? v.validator_key ?? 'Unknown Validator'),
          reliabilityScore: Number(v.reliability ?? v.score ?? 0.95),
          latency: Number(v.latency ?? 100),
          status: parsePublisherStatus(v.status),
          staked: Number(v.stake ?? v.staked ?? 0),
          stake: Number(v.stake ?? v.staked ?? 0),
          region: String(v.region ?? 'unknown'),
          uptime: Number(v.uptime ?? 99.9),
          commission: Number(v.commission ?? 0),
          totalResponses: Number(v.total_responses ?? 0),
          rewards: Number(v.rewards ?? 0),
          performance: Number(v.performance ?? v.reliability ?? 0.95) * 100,
        });
      }
    }
  }

  return validators;
}
