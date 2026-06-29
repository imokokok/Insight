import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { createLogger } from '@/lib/utils/logger';
import type { Blockchain, OracleProvider, PriceData } from '@/types/oracle';

import { STABLECOIN_RISK_THRESHOLDS } from '../risk/constants';
import { trackRiskLevelDuration } from '../risk/durationTracker';
import { calculateDeviationPercent, calculateFilteredMedian, getRiskLevel } from '../risk/utils';

import { findAffectedStablecoinProtocols } from './affectedProtocols';
import { getStablecoinConfig, type StablecoinSymbol } from './config';

import type { SourcePriceSnapshot } from '../risk/types';

const logger = createLogger('stablecoin-monitor');

export interface StablecoinDepegSnapshot {
  symbol: StablecoinSymbol;
  displayName: string;
  targetPeg: number;
  referencePrice: number;
  referenceMethod: 'filtered-median';
  maxDeviationPercent: number;
  minPrice: number;
  maxPrice: number;
  spreadPercent: number;
  durationSeconds: number;
  riskLevel: 'normal' | 'warning' | 'critical' | 'severe';
  sources: SourcePriceSnapshot[];
  affectedProtocols: ReturnType<typeof findAffectedStablecoinProtocols>;
  lastUpdated: number;
}

interface PriceFetchResult {
  source: { provider: OracleProvider; chain: Blockchain; displayName: string };
  priceData: PriceData | null;
  error?: string;
}

export async function calculateStablecoinDepegSnapshot(
  symbol: StablecoinSymbol
): Promise<StablecoinDepegSnapshot> {
  const config = getStablecoinConfig(symbol);
  if (!config) {
    throw new Error(`Stablecoin not configured: ${symbol}`);
  }

  const fetchResults = await Promise.all(
    config.sources.map(async (source) => {
      try {
        const priceData = await fetchPriceWithDatabase(
          source.provider,
          source.symbol,
          source.chain,
          true,
          false
        );
        return {
          source,
          priceData,
        } as PriceFetchResult;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(
          `Failed to fetch ${source.provider}/${source.symbol} on ${source.chain}: ${message}`
        );
        return {
          source,
          priceData: null,
          error: message,
        } as PriceFetchResult;
      }
    })
  );

  const successfulResults = fetchResults.filter(
    (r): r is PriceFetchResult & { priceData: PriceData } =>
      r.priceData !== null && r.priceData.price > 0 && Number.isFinite(r.priceData.price)
  );

  if (successfulResults.length === 0) {
    throw new Error(`No valid price sources for ${symbol}`);
  }

  const prices = successfulResults.map((r) => r.priceData.price);
  const referencePrice = calculateFilteredMedian(prices);

  const sources: SourcePriceSnapshot[] = successfulResults.map((r) => ({
    sourceId: `${r.source.provider}:${r.source.chain}:${symbol}`,
    provider: r.priceData.provider,
    chain: (r.priceData.chain ?? r.source.chain) as Blockchain,
    symbol,
    price: r.priceData.price,
    timestamp: r.priceData.timestamp,
    deviationPercent: calculateDeviationPercent(r.priceData.price, referencePrice),
    verification: r.priceData.verification,
  }));

  const deviations = sources.map((s) => s.deviationPercent);
  const maxDeviationPercent = deviations.reduce(
    (max, d) => (Math.abs(d) > Math.abs(max) ? d : max),
    0
  );
  const minPrice = Math.min(...sources.map((s) => s.price));
  const maxPrice = Math.max(...sources.map((s) => s.price));
  const spreadPercent = referencePrice > 0 ? ((maxPrice - minPrice) / referencePrice) * 100 : 0;

  const riskLevel = getRiskLevel(maxDeviationPercent, STABLECOIN_RISK_THRESHOLDS);
  const durationSeconds = trackRiskLevelDuration(`stablecoin:${symbol}`, riskLevel);

  return {
    symbol,
    displayName: config.displayName,
    targetPeg: config.targetPeg,
    referencePrice: Number(referencePrice.toFixed(6)),
    referenceMethod: 'filtered-median',
    maxDeviationPercent: Number(maxDeviationPercent.toFixed(4)),
    minPrice: Number(minPrice.toFixed(6)),
    maxPrice: Number(maxPrice.toFixed(6)),
    spreadPercent: Number(spreadPercent.toFixed(4)),
    durationSeconds,
    riskLevel,
    sources: sources.sort((a, b) => a.price - b.price),
    affectedProtocols: findAffectedStablecoinProtocols(symbol),
    lastUpdated: Date.now(),
  };
}

export async function calculateAllStablecoinSnapshots(): Promise<StablecoinDepegSnapshot[]> {
  const { STABLECOINS } = await import('./config');
  const results = await Promise.allSettled(
    STABLECOINS.map((coin) => calculateStablecoinDepegSnapshot(coin.symbol))
  );

  const snapshots: StablecoinDepegSnapshot[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      snapshots.push(result.value);
    } else {
      logger.error('Failed to calculate stablecoin snapshot', result.reason);
    }
  }

  return snapshots.sort(
    (a, b) => Math.abs(b.maxDeviationPercent) - Math.abs(a.maxDeviationPercent)
  );
}
