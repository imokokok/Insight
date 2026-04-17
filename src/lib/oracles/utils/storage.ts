import { type PriceRecordInsert, type PriceRecord } from '@/lib/supabase/queries';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { type PriceData, type OracleProvider, type Blockchain } from '@/types/oracle';

const logger = createLogger('oracle-storage');

export interface OracleStorageConfig {
  enabled: boolean;
  defaultExpirationHours: number;
}

const DEFAULT_CONFIG: OracleStorageConfig = {
  enabled: true,
  defaultExpirationHours: 24,
};

let storageConfig: OracleStorageConfig = { ...DEFAULT_CONFIG };

export function configureStorage(config: Partial<OracleStorageConfig>): void {
  storageConfig = { ...storageConfig, ...config };
}

export function getStorageConfig(): OracleStorageConfig {
  return { ...storageConfig };
}

export function shouldUseDatabase(): boolean {
  if (typeof window !== 'undefined') {
    return false;
  }
  return storageConfig.enabled;
}

function calculateExpirationDate(hours: number = storageConfig.defaultExpirationHours): string {
  const now = new Date();
  now.setHours(now.getHours() + hours);
  return now.toISOString();
}

function priceDataToRecord(priceData: PriceData): PriceRecordInsert {
  return {
    provider: priceData.provider,
    symbol: priceData.symbol,
    chain: priceData.chain,
    price: priceData.price,
    timestamp: priceData.timestamp,
    decimals: priceData.decimals,
    confidence: priceData.confidence,
    source: priceData.source,
    ttl: calculateExpirationDate(),
  };
}

function recordToPriceData(record: PriceRecord): PriceData {
  return {
    provider: record.provider as OracleProvider,
    symbol: record.symbol,
    chain: record.chain as Blockchain | undefined,
    price: record.price,
    timestamp: new Date(record.timestamp).getTime(),
    confidence: record.confidence ?? undefined,
    source: record.source ?? undefined,
  };
}

export async function savePriceToDatabase(priceData: PriceData): Promise<boolean> {
  if (!shouldUseDatabase()) {
    return false;
  }

  try {
    const queries = getServerQueries();
    const record = priceDataToRecord(priceData);
    const result = await queries.savePriceRecord(record);
    return result !== null;
  } catch (error) {
    logger.error(
      'Failed to save price to database',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export async function savePricesToDatabase(priceDataArray: PriceData[]): Promise<number> {
  if (!shouldUseDatabase() || priceDataArray.length === 0) {
    return 0;
  }

  try {
    const queries = getServerQueries();
    const records = priceDataArray.map(priceDataToRecord);
    const results = await queries.savePriceRecords(records);
    return results?.length || 0;
  } catch (error) {
    logger.error(
      'Failed to save prices to database',
      error instanceof Error ? error : new Error(String(error))
    );
    return 0;
  }
}

export async function getPriceFromDatabase(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
): Promise<PriceData | null> {
  if (!shouldUseDatabase()) {
    return null;
  }

  try {
    const queries = getServerQueries();
    const record = await queries.getLatestPrice(provider, symbol, chain);

    if (!record) {
      return null;
    }

    return recordToPriceData(record);
  } catch (error) {
    logger.error(
      'Failed to get price from database',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function getHistoricalPricesFromDatabase(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain | undefined,
  period: number
): Promise<PriceData[] | null> {
  if (!shouldUseDatabase()) {
    return null;
  }

  try {
    const queries = getServerQueries();
    const now = Date.now();
    const startTime = now - period * 60 * 60 * 1000;

    const records = await queries.getPriceRecords({
      provider,
      symbol,
      chain,
      startTime,
      endTime: now,
      limit: period * 4,
    });

    if (!records || records.length === 0) {
      return null;
    }

    return records.map(recordToPriceData);
  } catch (error) {
    logger.error(
      'Failed to get historical prices from database',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export async function savePriceWithFallback(
  priceData: PriceData,
  fallback: () => Promise<PriceData>
): Promise<PriceData> {
  const dbPrice = await getPriceFromDatabase(priceData.provider, priceData.symbol, priceData.chain);

  if (dbPrice) {
    return dbPrice;
  }

  const result = await fallback();
  await savePriceToDatabase(result);
  return result;
}

export async function saveHistoricalPricesWithFallback(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain | undefined,
  period: number,
  fallback: () => Promise<PriceData[]>
): Promise<PriceData[]> {
  const dbPrices = await getHistoricalPricesFromDatabase(provider, symbol, chain, period);

  if (dbPrices && dbPrices.length > 0) {
    return dbPrices;
  }

  const results = await fallback();
  await savePricesToDatabase(results);
  return results;
}
