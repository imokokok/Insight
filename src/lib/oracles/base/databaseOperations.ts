import { PriceFetchError, OracleClientError } from '@/lib/errors';
import { type Blockchain, type PriceData, type OracleProvider } from '@/types/oracle';

import {
  shouldUseDatabase,
  getPriceFromDatabase,
  getHistoricalPricesFromDatabase,
} from '../storage';

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

    throw new PriceFetchError(
      `No price data available for ${symbol} from ${provider}. Please ensure real data sources are configured.`,
      {
        provider,
        symbol,
        chain,
        retryable: true,
      }
    );
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
  useDatabase: boolean
): Promise<PriceData[]> {
  try {
    if (useDatabase && shouldUseDatabase()) {
      const dbPrices = await getHistoricalPricesFromDatabase(provider, symbol, chain, period);
      if (dbPrices && dbPrices.length > 0) {
        return dbPrices;
      }
    }

    throw new PriceFetchError(
      `No historical price data available for ${symbol} from ${provider}. Please ensure real data sources are configured.`,
      {
        provider,
        symbol,
        chain,
        timestamp: Date.now(),
        retryable: true,
      }
    );
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
