import { PriceFetchError, OracleClientError } from '@/lib/errors';
import { type Blockchain, type PriceData, type OracleProvider } from '@/types/oracle';

import {
  shouldUseDatabase,
  getPriceFromDatabase,
  getHistoricalPricesFromDatabase,
  savePriceToDatabase,
  savePricesToDatabase,
} from '../utils/storage';

// Lazy import factory to avoid circular dependency
async function getOracleClient(provider: OracleProvider) {
  const { getDefaultFactory } = await import('@/lib/oracles/factory');
  return getDefaultFactory().getClient(provider);
}

export async function fetchPriceWithDatabase(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain | undefined,
  useDatabase: boolean
): Promise<PriceData> {
  try {
    if (useDatabase && shouldUseDatabase()) {
      const dbPrice = await getPriceFromDatabase(provider, symbol, chain);
      if (dbPrice) {
        return dbPrice;
      }
    }

    const client = await getOracleClient(provider);
    const livePrice = await client.getPrice(symbol, chain);
    savePriceToDatabase(livePrice).catch(() => {});
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
    if (useDatabase && shouldUseDatabase()) {
      const dbPrices = await getHistoricalPricesFromDatabase(provider, symbol, chain, period);
      if (dbPrices && dbPrices.length > 0) {
        return dbPrices;
      }
    }

    const client = await getOracleClient(provider);
    const livePrices = await client.getHistoricalPrices(symbol, chain, period);
    if (livePrices && livePrices.length > 0) {
      savePricesToDatabase(livePrices).catch(() => {});
    }
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
