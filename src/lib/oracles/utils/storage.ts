import { type PriceRecordInsert, type PriceRecord } from '@/lib/supabase/queries';
import { getAdminQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { type PriceData, type OracleProvider, type Blockchain } from '@/types/oracle';
import { type FailureMode, type OracleSignalVector } from '@/types/oracle/signals';

const logger = createLogger('oracle-storage');

interface OracleStorageConfig {
  enabled: boolean;
  defaultExpirationHours: number;
}

const DEFAULT_CONFIG: OracleStorageConfig = {
  enabled: true,
  defaultExpirationHours: 24,
};

const storageConfig: OracleStorageConfig = { ...DEFAULT_CONFIG };

export function shouldUseDatabase(): boolean {
  if (typeof window !== 'undefined') {
    return false;
  }
  return storageConfig.enabled;
}

function calculateExpirationDate(hours: number = storageConfig.defaultExpirationHours): string {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

function priceDataToRecord(priceData: PriceData): PriceRecordInsert {
  return {
    provider: priceData.provider,
    symbol: priceData.symbol,
    chain: priceData.chain ?? null,
    price: priceData.price,
    timestamp: priceData.timestamp,
    decimals: priceData.decimals ?? null,
    confidence: priceData.confidence ?? null,
    source: priceData.source ?? null,
    verification: priceData.verification ?? null,
    ingestion_timestamp: priceData.ingestionTimestamp ?? null,
    metadata_fallback: priceData.metadataFallback ?? null,
    failure_mode: priceData.failureMode ?? null,
    signal_vector: priceData.signalVector ? { ...priceData.signalVector } : null,
    ttl: calculateExpirationDate(),
  };
}

function recordToPriceData(record: PriceRecord): PriceData {
  return {
    provider: record.provider as OracleProvider,
    symbol: record.symbol,
    chain: (record.chain as Blockchain | null) ?? undefined,
    price: record.price,
    timestamp: new Date(record.timestamp).getTime(),
    decimals: record.decimals ?? undefined,
    confidence: record.confidence ?? undefined,
    source: record.source ?? undefined,
    verification: record.verification ?? undefined,
    ingestionTimestamp: record.ingestion_timestamp
      ? new Date(record.ingestion_timestamp).getTime()
      : undefined,
    metadataFallback: record.metadata_fallback ?? undefined,
    failureMode: (record.failure_mode as FailureMode | null) ?? undefined,
    signalVector: (record.signal_vector as OracleSignalVector | null) ?? undefined,
  };
}

export async function savePriceToDatabase(priceData: PriceData): Promise<boolean> {
  if (!shouldUseDatabase()) {
    return false;
  }

  try {
    const queries = getAdminQueries();
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

export async function getPriceFromDatabase(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
): Promise<PriceData | null> {
  if (!shouldUseDatabase()) {
    return null;
  }

  try {
    const queries = getAdminQueries();
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
    const queries = getAdminQueries();
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
