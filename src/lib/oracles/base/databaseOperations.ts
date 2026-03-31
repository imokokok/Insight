import { PriceFetchError, OracleClientError } from '@/lib/errors';
import { type Blockchain, type PriceData, type OracleProvider } from '@/types/oracle';

import {
  shouldUseDatabase,
  savePriceToDatabase,
  savePricesToDatabase,
  getPriceFromDatabase,
  getHistoricalPricesFromDatabase,
} from '../storage';

export async function fetchPriceWithDatabase(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain | undefined,
  useDatabase: boolean,
  mockGenerator: () => PriceData
): Promise<PriceData> {
  try {
    if (useDatabase && shouldUseDatabase()) {
      const dbPrice = await getPriceFromDatabase(provider, symbol, chain);
      if (dbPrice) {
        return dbPrice;
      }
    }

    const priceData = mockGenerator();

    if (useDatabase && shouldUseDatabase()) {
      await savePriceToDatabase(priceData);
    }

    return priceData;
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
      undefined,
      error instanceof Error ? error : undefined
    );
  }
}

export async function fetchHistoricalPricesWithDatabase(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain | undefined,
  period: number,
  useDatabase: boolean,
  mockGenerator: () => PriceData[]
): Promise<PriceData[]> {
  try {
    if (useDatabase && shouldUseDatabase()) {
      const dbPrices = await getHistoricalPricesFromDatabase(provider, symbol, chain, period);
      if (dbPrices && dbPrices.length > 0) {
        return dbPrices;
      }
    }

    const pricesData = mockGenerator();

    if (useDatabase && shouldUseDatabase()) {
      await savePricesToDatabase(pricesData);
    }

    return pricesData;
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
      undefined,
      error instanceof Error ? error : undefined
    );
  }
}
