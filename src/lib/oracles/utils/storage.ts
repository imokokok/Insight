import { type PriceRecordInsert, type PriceRecord } from '@/lib/supabase/queries';
import { createServiceRoleClient, getAdminQueries } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';
import { type PriceData, type OracleProvider, type Blockchain } from '@/types/oracle';
import { type FailureMode, type OracleSignalVector } from '@/types/oracle/signals';

import { BLOCKCHAIN_TO_CHAIN_ID, getBlockchainByChainId } from '../constants/chainMapping';

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

interface HistoricalSnapshotRow {
  snapshot_ts: string;
  provider: string;
  symbol: string;
  chain_id: number;
  price: number | string;
  confidence: number | string | null;
}

function snapshotToPriceData(
  row: HistoricalSnapshotRow,
  requestedChain?: Blockchain
): PriceData | null {
  const price = Number(row.price);
  const timestamp = new Date(row.snapshot_ts).getTime();
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(timestamp)) {
    return null;
  }

  const confidence = row.confidence === null ? undefined : Number(row.confidence);
  return {
    provider: row.provider as OracleProvider,
    symbol: row.symbol,
    chain: requestedChain ?? getBlockchainByChainId(row.chain_id),
    price,
    timestamp,
    ingestionTimestamp: timestamp,
    confidence: Number.isFinite(confidence) ? confidence : undefined,
    source: 'price_snapshots',
  };
}

function mergeHistoricalPrices(...groups: Array<PriceData[] | null>): PriceData[] {
  const byTimestamp = new Map<number, PriceData>();

  // Snapshot rows are passed first and richer price_records second, so an
  // exact timestamp collision preserves the richer record.
  for (const group of groups) {
    for (const price of group ?? []) {
      if (price.price > 0 && Number.isFinite(price.price) && Number.isFinite(price.timestamp)) {
        byTimestamp.set(price.timestamp, price);
      }
    }
  }

  return [...byTimestamp.values()].sort((a, b) => a.timestamp - b.timestamp);
}

async function getHistoricalPricesFromSnapshots(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain | undefined,
  startTime: number,
  endTime: number,
  limit: number
): Promise<PriceData[] | null> {
  try {
    let query = createServiceRoleClient()
      .from('price_snapshots')
      .select('snapshot_ts, provider, symbol, chain_id, price, confidence')
      .eq('provider', provider)
      .eq('symbol', symbol.toUpperCase())
      .eq('is_success', true)
      .gte('snapshot_ts', new Date(startTime).toISOString())
      .lte('snapshot_ts', new Date(endTime).toISOString())
      .order('snapshot_ts', { ascending: true });

    if (chain) {
      query = query.eq('chain_id', BLOCKCHAIN_TO_CHAIN_ID[chain] ?? 0);
    }

    const { data, error } = await query.limit(limit);
    if (error) {
      logger.error('Failed to get historical price snapshots', normalizeError(error));
      return null;
    }

    const prices = ((data ?? []) as HistoricalSnapshotRow[])
      .map((row) => snapshotToPriceData(row, chain))
      .filter((price): price is PriceData => price !== null);
    return prices.length > 0 ? prices : null;
  } catch (error) {
    logger.error('Failed to get historical price snapshots', normalizeError(error));
    return null;
  }
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
    logger.error('Failed to save price to database', normalizeError(error));
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
    logger.error('Failed to get price from database', normalizeError(error));
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

    const [records, snapshots] = await Promise.all([
      queries.getPriceRecords({
        provider,
        symbol,
        chain,
        startTime,
        endTime: now,
        limit: period * 4,
      }),
      getHistoricalPricesFromSnapshots(provider, symbol, chain, startTime, now, period * 4),
    ]);

    // price_records is a 24-hour TTL cache. It may enrich the recent edge of a
    // historical response, but it must never masquerade as long-term coverage
    // when the durable 15-minute archive has no data.
    if (period > storageConfig.defaultExpirationHours && !snapshots?.length) {
      return null;
    }

    const recordPrices = records?.map(recordToPriceData) ?? null;
    const merged = mergeHistoricalPrices(snapshots, recordPrices);
    return merged.length > 0 ? merged : null;
  } catch (error) {
    logger.error('Failed to get historical prices from database', normalizeError(error));
    return null;
  }
}
