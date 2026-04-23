import { PriceFetchError, OracleClientError } from '@/lib/errors';
import { OracleProvider } from '@/types/oracle';
import { type Blockchain, type PriceData } from '@/types/oracle';

import {
  shouldUseDatabase,
  getPriceFromDatabase,
  getHistoricalPricesFromDatabase,
  savePriceToDatabase,
  savePricesToDatabase,
} from '../utils/storage';

const PROVIDERS_WITH_EXTRA_FIELDS = new Set([
  OracleProvider.CHAINLINK,
  OracleProvider.PYTH,
  OracleProvider.API3,
]);

async function getOracleClient(provider: OracleProvider) {
  const { getDefaultFactory } = await import('@/lib/oracles/factory');
  return getDefaultFactory().getClient(provider);
}

export async function fetchPriceWithDatabase(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain | undefined,
  useDatabase: boolean,
  forceRefresh: boolean = false
): Promise<PriceData> {
  try {
    if (
      !forceRefresh &&
      useDatabase &&
      shouldUseDatabase() &&
      !PROVIDERS_WITH_EXTRA_FIELDS.has(provider)
    ) {
      const dbPrice = await getPriceFromDatabase(provider, symbol, chain);
      if (dbPrice) {
        return dbPrice;
      }
    }

    const client = await getOracleClient(provider);

    if (
      forceRefresh &&
      'clearCache' in client &&
      typeof (client as { clearCache: () => void }).clearCache === 'function'
    ) {
      (client as { clearCache: () => void }).clearCache();
    }

    const livePrice = await client.getPrice(symbol, chain);
    if (!PROVIDERS_WITH_EXTRA_FIELDS.has(provider)) {
      savePriceToDatabase(livePrice).catch(() => {});
    }
    return livePrice;
  } catch (error) {
    if (error instanceof PriceFetchError || error instanceof OracleClientError) {
      throw error;
    }
    throw new PriceFetchError(
      `Failed to fetch price for ${symbol} from ${provider}`,
      {
        provider,
        symbol,
        chain,
        retryable: true,
      },
      error instanceof Error ? error : undefined
    );
  }
}

export async function fetchHistoricalPricesWithDatabase(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain | undefined,
  period: number,
  useDatabase: boolean
): Promise<PriceData[]> {
  try {
    const client = await getOracleClient(provider);
    const livePrices = await client.getHistoricalPrices(symbol, chain, period);
    return livePrices;
  } catch (error) {
    if (error instanceof PriceFetchError || error instanceof OracleClientError) {
      throw error;
    }
    throw new PriceFetchError(
      `Failed to fetch historical prices for ${symbol} from ${provider}`,
      {
        provider,
        symbol,
        chain,
        timestamp: Date.now(),
        retryable: true,
      },
      error instanceof Error ? error : undefined
    );
  }
}
