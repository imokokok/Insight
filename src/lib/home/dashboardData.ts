import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('dashboard-data');

export const DASHBOARD_ASSETS = ['BTC', 'ETH', 'USDT', 'SOL'] as const;

export const MAIN_ORACLES: OracleProvider[] = [
  OracleProvider.CHAINLINK,
  OracleProvider.PYTH,
  OracleProvider.REDSTONE,
  OracleProvider.API3,
  OracleProvider.DIA,
];

export interface DashboardPriceItem {
  provider: string;
  symbol: string;
  price: PriceData | null;
  error: string | null;
}

export interface ServerDashboardData {
  prices: DashboardPriceItem[];
  fetchedAt: number;
  hasError: boolean;
}

export async function fetchDashboardInitialData(): Promise<ServerDashboardData> {
  const queries: Array<{ provider: OracleProvider; symbol: string }> = [];
  for (const symbol of DASHBOARD_ASSETS) {
    for (const provider of MAIN_ORACLES) {
      queries.push({ provider, symbol });
    }
  }

  const results = await Promise.all(
    queries.map(async (query): Promise<DashboardPriceItem> => {
      try {
        const price = await fetchPriceWithDatabase(query.provider, query.symbol, undefined, true);
        return {
          provider: query.provider,
          symbol: query.symbol,
          price,
          error: null,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`Server prefetch failed for ${query.provider}/${query.symbol}: ${message}`);
        return {
          provider: query.provider,
          symbol: query.symbol,
          price: null,
          error: message,
        };
      }
    })
  );

  return {
    prices: results,
    fetchedAt: Date.now(),
    hasError: results.some((r) => r.error !== null),
  };
}
