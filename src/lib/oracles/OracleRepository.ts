import { type Blockchain, type PriceData, type OracleProvider } from '@/types/oracle';

import {
  fetchPriceWithDatabase,
  fetchHistoricalPricesWithDatabase,
} from './base/databaseOperations';

class OracleRepository {
  static async fetchPrice(
    provider: OracleProvider,
    symbol: string,
    chain: Blockchain | undefined,
    useDatabase?: boolean
  ): Promise<PriceData> {
    return fetchPriceWithDatabase(provider, symbol, chain, useDatabase ?? true);
  }

  static async fetchHistoricalPrices(
    provider: OracleProvider,
    symbol: string,
    chain: Blockchain | undefined,
    period: number,
    useDatabase?: boolean
  ): Promise<PriceData[]> {
    return fetchHistoricalPricesWithDatabase(provider, symbol, chain, period, useDatabase ?? true);
  }
}
