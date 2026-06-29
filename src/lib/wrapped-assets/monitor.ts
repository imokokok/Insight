import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { createLogger } from '@/lib/utils/logger';
import { Blockchain, OracleProvider } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { WRAPPED_ASSET_RISK_THRESHOLDS } from '../risk/constants';
import { trackRiskLevelDuration } from '../risk/durationTracker';
import { calculateDeviationPercent, calculateFilteredMedian, getRiskLevel } from '../risk/utils';

import { findAffectedWrappedAssetProtocols } from './affectedProtocols';
import { getWrappedAssetConfig } from './config';
import { lstExchangeRateService } from './exchangeRateService';

import type { SourcePriceSnapshot } from '../risk/types';

const logger = createLogger('wrapped-asset-monitor');

// Fallback exchange rates used when on-chain read fails.
const LST_EXCHANGE_RATE_FALLBACK: Record<string, number> = {
  wstETH: 1.15,
  cbETH: 1.05,
};

export interface WrappedAssetSnapshot {
  symbol: string;
  displayName: string;
  type: 'wrapped-btc' | 'lst-eth';
  underlyingSymbol: string;
  wrappedMarketPrice: number;
  underlyingReferencePrice: number;
  exchangeRate: number;
  fairUnderlyingPrice: number;
  deviationPercent: number;
  riskLevel: 'normal' | 'warning' | 'critical' | 'severe';
  durationSeconds: number;
  sources: SourcePriceSnapshot[];
  affectedProtocols: ReturnType<typeof findAffectedWrappedAssetProtocols>;
  lastUpdated: number;
}

interface PriceFetchResult {
  source: { provider: OracleProvider; chain: Blockchain; displayName: string };
  priceData: PriceData | null;
  error?: string;
}

async function fetchWrappedPrices(config: {
  priceSources: {
    provider: OracleProvider;
    chain: Blockchain;
    displayName: string;
    symbol: string;
  }[];
}): Promise<PriceFetchResult[]> {
  return Promise.all(
    config.priceSources.map(async (source) => {
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
}

async function fetchUnderlyingReferencePrice(underlyingSymbol: string): Promise<number> {
  // Use Chainlink on Ethereum as the reference for BTC/ETH
  const symbol = underlyingSymbol;
  const chain = Blockchain.ETHEREUM;
  const provider = OracleProvider.CHAINLINK;

  try {
    const priceData = await fetchPriceWithDatabase(provider, symbol, chain, true, false);
    if (priceData && priceData.price > 0 && Number.isFinite(priceData.price)) {
      return priceData.price;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to fetch underlying reference ${symbol}: ${message}`);
  }

  throw new Error(`No valid underlying reference price for ${symbol}`);
}

async function getExchangeRate(symbol: string, type: 'wrapped-btc' | 'lst-eth'): Promise<number> {
  if (type === 'wrapped-btc') return 1;

  try {
    return await lstExchangeRateService.getExchangeRate(symbol);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to fetch on-chain exchange rate for ${symbol}, using fallback: ${message}`);
    return LST_EXCHANGE_RATE_FALLBACK[symbol] ?? 1;
  }
}

export async function calculateWrappedAssetSnapshot(symbol: string): Promise<WrappedAssetSnapshot> {
  const config = getWrappedAssetConfig(symbol);
  if (!config) {
    throw new Error(`Wrapped asset not configured: ${symbol}`);
  }

  const wrappedResults = await fetchWrappedPrices(config);
  const successfulResults = wrappedResults.filter(
    (r): r is PriceFetchResult & { priceData: PriceData } =>
      r.priceData !== null && r.priceData.price > 0 && Number.isFinite(r.priceData.price)
  );

  if (successfulResults.length === 0) {
    throw new Error(`No valid price sources for ${symbol}`);
  }

  const wrappedPrices = successfulResults.map((r) => r.priceData.price);
  const wrappedMarketPrice = calculateFilteredMedian(wrappedPrices);

  const [underlyingReferencePrice, exchangeRate] = await Promise.all([
    fetchUnderlyingReferencePrice(config.underlyingSymbol),
    getExchangeRate(symbol, config.type),
  ]);

  // For LST: fairUnderlyingPrice = wrappedMarketPrice / exchangeRate
  // For 1:1 wrapped: fairUnderlyingPrice = wrappedMarketPrice
  const fairUnderlyingPrice = wrappedMarketPrice / exchangeRate;
  const deviationPercent = calculateDeviationPercent(fairUnderlyingPrice, underlyingReferencePrice);

  const sources: SourcePriceSnapshot[] = successfulResults.map((r) => ({
    sourceId: `${r.source.provider}:${r.source.chain}:${symbol}`,
    provider: r.priceData.provider,
    chain: (r.priceData.chain ?? r.source.chain) as Blockchain,
    symbol,
    price: r.priceData.price,
    timestamp: r.priceData.timestamp,
    deviationPercent: calculateDeviationPercent(
      r.priceData.price / exchangeRate,
      underlyingReferencePrice
    ),
    verification: r.priceData.verification,
  }));

  const riskLevel = getRiskLevel(deviationPercent, WRAPPED_ASSET_RISK_THRESHOLDS);
  const durationSeconds = trackRiskLevelDuration(`wrapped:${symbol}`, riskLevel);

  return {
    symbol,
    displayName: config.displayName,
    type: config.type,
    underlyingSymbol: config.underlyingSymbol,
    wrappedMarketPrice: Number(wrappedMarketPrice.toFixed(6)),
    underlyingReferencePrice: Number(underlyingReferencePrice.toFixed(2)),
    exchangeRate: Number(exchangeRate.toFixed(6)),
    fairUnderlyingPrice: Number(fairUnderlyingPrice.toFixed(6)),
    deviationPercent: Number(deviationPercent.toFixed(4)),
    durationSeconds,
    riskLevel,
    sources: sources.sort((a, b) => a.price - b.price),
    affectedProtocols: findAffectedWrappedAssetProtocols(symbol),
    lastUpdated: Date.now(),
  };
}

export async function calculateAllWrappedAssetSnapshots(): Promise<WrappedAssetSnapshot[]> {
  const { WRAPPED_ASSETS } = await import('./config');
  const results = await Promise.allSettled(
    WRAPPED_ASSETS.map((asset) => calculateWrappedAssetSnapshot(asset.symbol))
  );

  const snapshots: WrappedAssetSnapshot[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      snapshots.push(result.value);
    } else {
      logger.error('Failed to calculate wrapped asset snapshot', result.reason);
    }
  }

  return snapshots.sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent));
}
