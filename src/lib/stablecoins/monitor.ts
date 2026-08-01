import { ORACLE_CACHE_TTL } from '@/lib/oracles/base';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { curvePoolService } from '@/lib/oracles/services/curvePoolService';
import { twapOnChainService } from '@/lib/oracles/services/twapOnChainService';
import { TTLCache } from '@/lib/utils/cache';
import { createLogger } from '@/lib/utils/logger';
import type { Blockchain, OracleProvider, PriceData } from '@/types/oracle';

import {
  MARKET_RISK_THRESHOLDS,
  ORACLE_MARKET_RISK_THRESHOLDS,
  STABLECOIN_RISK_THRESHOLDS,
} from '../risk/constants';
import { trackRiskLevelDuration } from '../risk/durationTracker';
import { calculateDeviationPercent, calculateFilteredMedian, getRiskLevel } from '../risk/utils';

import { findAffectedStablecoinProtocols } from './affectedProtocols';
import { getStablecoinConfig, type StablecoinSymbol, type DexPoolConfig } from './config';

import type {
  MarketDeviationResult,
  OracleMarketDivergence,
  RiskLevel,
  SourcePriceSnapshot,
} from '../risk/types';

const logger = createLogger('stablecoin-monitor');

const SNAPSHOT_CACHE_TTL = ORACLE_CACHE_TTL.PRICE;
const snapshotCache = new TTLCache({ maxSize: 16, cleanupIntervalMs: 60000 });

export interface StablecoinDepegSnapshot {
  symbol: StablecoinSymbol;
  displayName: string;
  targetPeg: number;

  // === Oracle dimension (existing) ===
  referencePrice: number;
  referenceMethod: 'filtered-median';
  maxDeviationPercent: number;
  minPrice: number;
  maxPrice: number;
  spreadPercent: number;

  // === Market dimension (new) ===
  marketReferencePrice: number;
  marketSpreadPercent: number;
  marketMinPrice: number;
  marketMaxPrice: number;

  // === Oracle-Market cross dimension (new, most critical) ===
  oracleMarketDivergencePercent: number;
  oracleMarketDirection: 'oracle-above-market' | 'oracle-below-market' | 'aligned';
  oracleMarketInterpretation: string;

  // === Composite ===
  durationSeconds: number;
  riskLevel: RiskLevel;
  riskReason: string;

  sources: SourcePriceSnapshot[];
  affectedProtocols: Awaited<ReturnType<typeof findAffectedStablecoinProtocols>>;
  lastUpdated: number;
}

interface PriceFetchResult {
  source: { provider: OracleProvider; chain: Blockchain; displayName: string };
  priceData: PriceData | null;
  error?: string;
}

// ---------- DEX price fetching helpers ----------

interface DexPriceFetchResult {
  pool: DexPoolConfig;
  price: number;
  error?: string;
}

async function fetchDexPrices(
  symbol: string,
  dexPools: DexPoolConfig[]
): Promise<DexPriceFetchResult[]> {
  const results = await Promise.all(
    dexPools.map(async (pool) => {
      try {
        let price: number | null = null;

        switch (pool.dexName) {
          case 'uniswap-v3': {
            const spotData = await twapOnChainService.getSpotPrice(symbol, pool.chainId);
            price = spotData.spotPrice;
            break;
          }
          case 'curve': {
            const reference = pool.token1Symbol;
            const curveResult = await curvePoolService.getStablecoinPrice(symbol, reference);
            price = curveResult?.price ?? null;
            break;
          }
        }

        if (price !== null && price > 0 && Number.isFinite(price)) {
          return { pool, price } as DexPriceFetchResult;
        }
        return { pool, price: 0, error: 'Invalid price' } as DexPriceFetchResult;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to fetch DEX price from ${pool.dexName} for ${symbol}: ${message}`);
        return { pool, price: 0, error: message } as DexPriceFetchResult;
      }
    })
  );

  return results.filter((r) => r.price > 0 && Number.isFinite(r.price));
}

// ---------- Market deviation calculation ----------

function calculateMarketDeviation(
  marketSources: SourcePriceSnapshot[]
): MarketDeviationResult | null {
  const validSources = marketSources.filter((s) => s.price > 0 && Number.isFinite(s.price));
  if (validSources.length === 0) return null;

  const prices = validSources.map((s) => s.price);
  const referencePrice = calculateFilteredMedian(prices);

  const deviations = validSources.map((s) => calculateDeviationPercent(s.price, referencePrice));
  const maxDeviationPercent = deviations.reduce(
    (max, d) => (Math.abs(d) > Math.abs(max) ? d : max),
    0
  );
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const spreadPercent = referencePrice > 0 ? ((maxPrice - minPrice) / referencePrice) * 100 : 0;

  return {
    referencePrice,
    maxDeviationPercent,
    minPrice,
    maxPrice,
    spreadPercent,
    riskLevel: getRiskLevel(maxDeviationPercent, MARKET_RISK_THRESHOLDS),
  };
}

// ---------- Oracle-Market divergence calculation ----------

function calculateOracleMarketDivergence(
  oracleMedian: number,
  marketMedian: number
): OracleMarketDivergence {
  if (marketMedian === 0) {
    return {
      oracleMedian,
      marketMedian: 0,
      divergencePercent: 0,
      direction: 'aligned',
      riskLevel: 'normal',
      interpretation: 'No market data available for comparison',
    };
  }

  const divergencePercent = ((oracleMedian - marketMedian) / marketMedian) * 100;
  const riskLevel = getRiskLevel(divergencePercent, ORACLE_MARKET_RISK_THRESHOLDS);

  let direction: OracleMarketDivergence['direction'];
  if (Math.abs(divergencePercent) < 0.1) {
    direction = 'aligned';
  } else if (divergencePercent > 0) {
    direction = 'oracle-above-market';
  } else {
    direction = 'oracle-below-market';
  }

  const interpretation = interpretOracleMarketDivergence(divergencePercent);

  return {
    oracleMedian,
    marketMedian,
    divergencePercent,
    direction,
    riskLevel,
    interpretation,
  };
}

function interpretOracleMarketDivergence(divergence: number): string {
  const abs = Math.abs(divergence);
  if (abs < 0.1) return 'Oracle and market prices are aligned';

  if (divergence > 0) {
    // Oracle reports higher than market → oracle lag during depeg
    if (abs >= 3)
      return `Oracle reports ${abs.toFixed(2)}% above market, indicating severe lag risk; lending protocols may underestimate depeg impact`;
    if (abs >= 1)
      return `Oracle reports ${abs.toFixed(2)}% above market, suggesting possible update delay`;
    return `Oracle reports ${abs.toFixed(2)}% above market, within normal range`;
  } else {
    // Oracle reports lower than market → rare, oracle anomaly or DEX illiquidity
    if (abs >= 3)
      return `Oracle reports ${abs.toFixed(2)}% below market; check for oracle source anomalies and DEX liquidity issues`;
    if (abs >= 1)
      return `Oracle reports ${abs.toFixed(2)}% below market; may indicate oracle anomaly or DEX illiquidity`;
    return `Oracle reports ${abs.toFixed(2)}% below market, within normal range`;
  }
}

// ---------- Composite risk calculation ----------

function calculateCompositeRisk(
  oracleRisk: RiskLevel,
  marketRisk: RiskLevel,
  crossRisk: RiskLevel
): { level: RiskLevel; reason: string } {
  const riskOrder: RiskLevel[] = ['normal', 'warning', 'critical', 'severe'];
  const levels = [oracleRisk, marketRisk, crossRisk];
  const maxLevel = levels.reduce((max, l) =>
    riskOrder.indexOf(l) > riskOrder.indexOf(max) ? l : max
  );

  // Generate one-sentence risk reason
  let reason: string;
  if (maxLevel === 'normal') {
    reason = 'All price sources are normal; no depeg risk detected';
  } else if (
    crossRisk !== 'normal' &&
    riskOrder.indexOf(crossRisk) >= riskOrder.indexOf(oracleRisk)
  ) {
    reason = `Divergence detected between oracle and DEX market prices; possible oracle lag or market anomaly`;
  } else if (marketRisk !== 'normal') {
    reason = `Abnormal deviation in DEX market prices; may reflect actual depeg conditions`;
  } else {
    reason = `Deviation among oracle quotes detected; check price source consistency`;
  }

  return { level: maxLevel, reason };
}

// ---------- Main snapshot calculation ----------

export async function calculateStablecoinDepegSnapshot(
  symbol: StablecoinSymbol
): Promise<StablecoinDepegSnapshot> {
  const cacheKey = `snapshot:${symbol}`;
  const cached = snapshotCache.get<StablecoinDepegSnapshot>(cacheKey);
  if (cached) {
    return cached;
  }

  const config = getStablecoinConfig(symbol);
  if (!config) {
    throw new Error(`Stablecoin not configured: ${symbol}`);
  }

  // === Step 1: Fetch Oracle prices (existing logic) ===
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

  const oraclePrices = successfulResults.map((r) => r.priceData.price);
  const oracleReferencePrice = calculateFilteredMedian(oraclePrices);

  const oracleSources: SourcePriceSnapshot[] = successfulResults.map((r) => ({
    sourceId: `${r.source.provider}:${r.source.chain}:${symbol}`,
    provider: r.priceData.provider,
    chain: (r.priceData.chain ?? r.source.chain) as Blockchain,
    symbol,
    price: r.priceData.price,
    timestamp: r.priceData.timestamp,
    deviationPercent: calculateDeviationPercent(r.priceData.price, oracleReferencePrice),
    verification: r.priceData.verification,
    category: 'oracle' as const,
  }));

  const oracleDeviations = oracleSources.map((s) => s.deviationPercent);
  const oracleMaxDeviation = oracleDeviations.reduce(
    (max, d) => (Math.abs(d) > Math.abs(max) ? d : max),
    0
  );
  const oracleMinPrice = Math.min(...oracleSources.map((s) => s.price));
  const oracleMaxPrice = Math.max(...oracleSources.map((s) => s.price));
  const oracleSpread =
    oracleReferencePrice > 0 ? ((oracleMaxPrice - oracleMinPrice) / oracleReferencePrice) * 100 : 0;

  // === Step 2: Fetch DEX market prices (new) ===
  const dexResults = await fetchDexPrices(symbol, config.dexPools);

  const marketSources: SourcePriceSnapshot[] = dexResults.map((r) => ({
    sourceId: `dex:${r.pool.dexName}:${r.pool.chain}:${symbol}`,
    provider: 'twap' as OracleProvider, // Use TWAP as provider for Uniswap; curve/1inch are not oracle providers
    chain: r.pool.chain as Blockchain,
    symbol,
    price: r.price,
    timestamp: Date.now(),
    deviationPercent: 0, // Will be calculated below
    category: 'market' as const,
    dexName: r.pool.dexName,
    poolAddress: r.pool.poolAddress,
    feeTier: r.pool.feeTier,
  }));

  // === Step 3: Calculate Market internal deviation ===
  const marketDeviation = calculateMarketDeviation(marketSources);

  // Update market source deviations against market reference
  if (marketDeviation) {
    for (const source of marketSources) {
      source.deviationPercent = calculateDeviationPercent(
        source.price,
        marketDeviation.referencePrice
      );
    }
  }

  // === Step 4: Calculate Oracle-Market cross divergence ===
  const marketMedian = marketDeviation?.referencePrice ?? 0;
  const crossDivergence = calculateOracleMarketDivergence(oracleReferencePrice, marketMedian);

  // === Step 5: Composite risk rating ===
  const oracleRisk = getRiskLevel(oracleMaxDeviation, STABLECOIN_RISK_THRESHOLDS);
  const marketRisk = marketDeviation?.riskLevel ?? 'normal';
  const crossRisk = crossDivergence.riskLevel;
  const composite = calculateCompositeRisk(oracleRisk, marketRisk, crossRisk);

  // === Step 6: Duration tracking (based on composite risk) ===
  const durationSeconds = trackRiskLevelDuration(`stablecoin:${symbol}`, composite.level);

  // === Step 7: Affected protocols (enhanced with divergence) ===
  const affectedProtocols = await findAffectedStablecoinProtocols(
    symbol,
    crossDivergence.divergencePercent
  );

  // === Build final snapshot ===
  const allSources = [...oracleSources, ...marketSources].sort((a, b) => a.price - b.price);

  const snapshot: StablecoinDepegSnapshot = {
    symbol,
    displayName: config.displayName,
    targetPeg: config.targetPeg,

    // Oracle dimension
    referencePrice: Number(oracleReferencePrice.toFixed(6)),
    referenceMethod: 'filtered-median',
    maxDeviationPercent: Number(oracleMaxDeviation.toFixed(4)),
    minPrice: Number(oracleMinPrice.toFixed(6)),
    maxPrice: Number(oracleMaxPrice.toFixed(6)),
    spreadPercent: Number(oracleSpread.toFixed(4)),

    // Market dimension
    marketReferencePrice: Number((marketDeviation?.referencePrice ?? 0).toFixed(6)),
    marketSpreadPercent: Number((marketDeviation?.spreadPercent ?? 0).toFixed(4)),
    marketMinPrice: Number((marketDeviation?.minPrice ?? 0).toFixed(6)),
    marketMaxPrice: Number((marketDeviation?.maxPrice ?? 0).toFixed(6)),

    // Oracle-Market cross dimension
    oracleMarketDivergencePercent: Number(crossDivergence.divergencePercent.toFixed(4)),
    oracleMarketDirection: crossDivergence.direction,
    oracleMarketInterpretation: crossDivergence.interpretation,

    // Composite
    durationSeconds,
    riskLevel: composite.level,
    riskReason: composite.reason,

    sources: allSources,
    affectedProtocols,
    lastUpdated: Date.now(),
  };

  snapshotCache.set(cacheKey, snapshot, SNAPSHOT_CACHE_TTL);
  return snapshot;
}

export async function calculateAllStablecoinSnapshots(): Promise<StablecoinDepegSnapshot[]> {
  const cacheKey = 'all-snapshots';
  const cached = snapshotCache.get<StablecoinDepegSnapshot[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const { STABLECOINS } = await import('./config');
  const results = await Promise.allSettled(
    STABLECOINS.map((coin) => calculateStablecoinDepegSnapshot(coin.symbol))
  );

  const snapshots: StablecoinDepegSnapshot[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      snapshots.push(result.value);
    } else {
      // "No valid price sources" is an expected, non-fatal condition: it means
      // the stablecoin's oracle feeds aren't active in the DB yet (e.g. a
      // niche coin pending feed sync). Log it as a warning so it doesn't read
      // as a system error; genuinely unexpected failures stay at error level.
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      const isNoSources = /^No valid price sources for /.test(reason);
      if (isNoSources) {
        logger.warn(`Stablecoin snapshot unavailable (no active feeds yet): ${reason}`);
      } else {
        logger.error('Failed to calculate stablecoin snapshot', result.reason);
      }
    }
  }

  const sorted = snapshots.sort(
    (a, b) => Math.abs(b.maxDeviationPercent) - Math.abs(a.maxDeviationPercent)
  );

  snapshotCache.set(cacheKey, sorted, SNAPSHOT_CACHE_TTL);
  return sorted;
}
