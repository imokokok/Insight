import type { OracleProvider, PriceData, Blockchain } from '@/types/oracle';

import { getDefaultFactory } from '../factory';

import type { IOracleClient } from '../interfaces';

export type TimeRangeValue = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

export function getHoursForTimeRange(range: TimeRangeValue): number | undefined {
  switch (range) {
    case '1H':
      return 1;
    case '24H':
      return 24;
    case '7D':
      return 168;
    case '30D':
      return 720;
    case '90D':
      return 2160;
    case '1Y':
      return 8760;
    case 'ALL':
      return undefined;
    default:
      return 24;
  }
}

interface OraclePriceFetchResult {
  provider: OracleProvider;
  price: number;
  timestamp: number;
  confidence?: number;
  responseTime: number;
  success: boolean;
  source?: string;
  error?: Error;
}

interface FetchOraclePriceOptions {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  includeHistorical?: boolean;
  historicalHours?: number | undefined;
}

interface FetchOraclePriceResult extends OraclePriceFetchResult {
  historicalData?: PriceData[];
}

export async function fetchOraclePrice(
  options: FetchOraclePriceOptions
): Promise<FetchOraclePriceResult> {
  const { provider, symbol, chain, includeHistorical = false, historicalHours } = options;
  const requestStart = Date.now();

  try {
    const client: IOracleClient = getDefaultFactory().getClient(provider);

    const baseSymbol = symbol.split('/')[0];

    if (includeHistorical) {
      const [price, historicalData] = await Promise.all([
        client.getPrice(baseSymbol, chain),
        client.getHistoricalPrices(baseSymbol, chain, historicalHours),
      ]);

      return {
        provider,
        price: price.price,
        timestamp: price.timestamp,
        confidence: price.confidence,
        responseTime: Date.now() - requestStart,
        success: true,
        source: price.source,
        historicalData,
      };
    }

    const price = await client.getPrice(baseSymbol, chain);

    return {
      provider,
      price: price.price,
      timestamp: price.timestamp,
      confidence: price.confidence,
      responseTime: Date.now() - requestStart,
      success: true,
      source: price.source,
    };
  } catch (error) {
    return {
      provider,
      price: 0,
      timestamp: Date.now(),
      responseTime: Date.now() - requestStart,
      success: false,
      source: 'error',
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

interface FetchMultipleOraclePricesOptions {
  providers: OracleProvider[];
  symbol: string;
  chain?: Blockchain;
  includeHistorical?: boolean;
  historicalHours?: number | undefined;
  onProgress?: (completed: number, total: number) => void;
}

interface FetchMultipleOraclePricesResult {
  results: OraclePriceFetchResult[];
  successCount: number;
  errorCount: number;
  totalResponseTime: number;
}

export async function fetchMultipleOraclePrices(
  options: FetchMultipleOraclePricesOptions
): Promise<FetchMultipleOraclePricesResult> {
  const {
    providers,
    symbol,
    chain,
    includeHistorical = false,
    historicalHours,
    onProgress,
  } = options;

  const results: OraclePriceFetchResult[] = [];
  let completed = 0;

  const promises = providers.map(async (provider) => {
    const result = await fetchOraclePrice({
      provider,
      symbol,
      chain,
      includeHistorical,
      historicalHours,
    });

    completed++;
    onProgress?.(completed, providers.length);

    return result;
  });

  const fetchResults = await Promise.all(promises);
  results.push(...fetchResults);

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;
  const totalResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0);

  return {
    results,
    successCount,
    errorCount,
    totalResponseTime,
  };
}

interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}

export function createPriceHistoryManager(maxPoints: number = 100) {
  const history: Map<OracleProvider, PriceHistoryPoint[]> = new Map();

  return {
    addPoint(provider: OracleProvider, timestamp: number, price: number): void {
      if (!history.has(provider)) {
        history.set(provider, []);
      }
      const providerHistory = history.get(provider)!;
      providerHistory.push({ timestamp, price });
      if (providerHistory.length > maxPoints) {
        providerHistory.shift();
      }
    },

    getHistory(provider: OracleProvider): PriceHistoryPoint[] {
      return history.get(provider) || [];
    },

    getAllHistory(): Record<OracleProvider, PriceHistoryPoint[]> {
      const result: Record<OracleProvider, PriceHistoryPoint[]> = {} as Record<
        OracleProvider,
        PriceHistoryPoint[]
      >;
      history.forEach((value, key) => {
        result[key] = [...value];
      });
      return result;
    },

    clear(provider?: OracleProvider): void {
      if (provider) {
        history.delete(provider);
      } else {
        history.clear();
      }
    },

    getMaxPoints(): number {
      return maxPoints;
    },
  };
}

type PriceHistoryManager = ReturnType<typeof createPriceHistoryManager>;

export function extractBaseSymbol(symbol: string): string {
  return symbol.split('/')[0];
}
