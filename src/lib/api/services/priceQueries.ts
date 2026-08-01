import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { createLogger } from '@/lib/utils/logger';
import { type Blockchain, type OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('protocol-health-prices');

interface PriceLookup {
  provider: OracleProvider;
  symbol: string;
  price: number;
  timestamp: number;
}

export async function fetchPricesForPosition(
  queries: { provider: OracleProvider; symbol: string; chain?: Blockchain }[]
): Promise<PriceLookup[]> {
  const results = await Promise.allSettled(
    queries.map(async (query) => {
      const priceData: PriceData = await fetchPriceWithDatabase(
        query.provider,
        query.symbol,
        query.chain,
        true,
        false
      );
      const price = priceData.price;
      if (price === null || price === undefined || !Number.isFinite(price) || price <= 0) {
        throw new Error(`Invalid or missing price for ${query.provider}/${query.symbol}`);
      }
      return {
        provider: query.provider,
        symbol: query.symbol,
        price,
        timestamp: priceData.timestamp ?? Date.now(),
      };
    })
  );

  const failed: string[] = [];
  const successful: PriceLookup[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const query = queries[i];
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push(`${query.provider}/${query.symbol}`);
      logger.warn(
        `Failed to fetch price for ${query.provider}/${query.symbol}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
      );
    }
  }

  if (failed.length > 0) {
    throw new Error(`Failed to fetch prices for: ${failed.join(', ')}`);
  }

  return successful;
}
