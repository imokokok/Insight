import { type PriceRecordInsert, type PriceRecord } from '@/lib/supabase/queries';
import { createServiceRoleClient, getAdminQueries } from '@/lib/supabase/server';
import { loadSnapshotHistoryRange } from '@/lib/supabase/snapshotHistory';
import {
  getTursoPriceClient,
  readTursoPriceRecordsFallbackOnMiss,
  readTursoPriceRecordsMode,
  readTursoPriceWriteMode,
} from '@/lib/turso/price/client';
import { loadTursoLatestPrice } from '@/lib/turso/price/historyRepository';
import {
  deleteExpiredTursoPriceRecords,
  insertTursoPriceRecords,
  listTursoPriceRecords,
  readTursoLatestPriceRecord,
} from '@/lib/turso/price/recordsRepository';
import { ensureTursoPriceSchema } from '@/lib/turso/price/schema';
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

// These adapters return evidence that price_records cannot round-trip.
export function supportsPricePersistence(provider: OracleProvider): boolean {
  return provider !== 'chainlink' && provider !== 'api3';
}

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
  data_age_seconds?: number | null;
}

/**
 * Read the newest successful 15-minute observation only after a live price
 * request has failed. Normal request paths keep their existing single
 * `price_records` cache lookup, so this resilience path does not turn routine
 * API traffic into an additional database read.
 */
export async function getLatestPriceSnapshotFromDatabase(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
): Promise<PriceData | null> {
  if (!shouldUseDatabase()) return null;

  try {
    const client = createServiceRoleClient();
    if (readTursoPriceWriteMode() !== 'primary') {
      let query = client
        .from('price_snapshots')
        .select('snapshot_ts, provider, symbol, chain_id, price, confidence, data_age_seconds')
        .eq('provider', provider)
        .eq('symbol', symbol)
        .eq('is_success', true)
        .gt('price', 0)
        .order('snapshot_ts', { ascending: false })
        .limit(1);

      if (chain) {
        query = query.eq('chain_id', BLOCKCHAIN_TO_CHAIN_ID[chain] ?? 0);
      }

      const { data, error } = await query.maybeSingle();
      if (error) {
        logger.error('Failed to get latest price snapshot fallback', normalizeError(error));
        return null;
      }

      return data ? snapshotToPriceData(data as HistoricalSnapshotRow, chain) : null;
    }
    const turso = getTursoPriceClient();
    await ensureTursoPriceSchema(turso);
    const latest = await loadTursoLatestPrice(turso, {
      provider,
      symbol: symbol.toUpperCase(),
      chainId: chain ? (BLOCKCHAIN_TO_CHAIN_ID[chain] ?? 0) : undefined,
      successOnly: true,
    });
    return latest ? snapshotToPriceData(latest, chain) : null;
  } catch (error) {
    logger.error('Failed to get latest price snapshot fallback', normalizeError(error));
    return null;
  }
}

function snapshotToPriceData(
  row: HistoricalSnapshotRow,
  requestedChain?: Blockchain
): PriceData | null {
  const price = Number(row.price);
  const snapshotTimestamp = new Date(row.snapshot_ts).getTime();
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(snapshotTimestamp)) {
    return null;
  }

  const confidence = row.confidence === null ? undefined : Number(row.confidence);
  const dataAgeSeconds = row.data_age_seconds;
  const timestamp =
    typeof dataAgeSeconds === 'number' && Number.isFinite(dataAgeSeconds) && dataAgeSeconds >= 0
      ? snapshotTimestamp - dataAgeSeconds * 1000
      : snapshotTimestamp;
  return {
    provider: row.provider as OracleProvider,
    symbol: row.symbol,
    chain: requestedChain ?? getBlockchainByChainId(row.chain_id),
    price,
    timestamp,
    ingestionTimestamp: snapshotTimestamp,
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
    const rows = await loadSnapshotHistoryRange(
      createServiceRoleClient(),
      'price',
      new Date(startTime).toISOString(),
      new Date(endTime).toISOString(),
      ['snapshot_ts', 'provider', 'symbol', 'chain_id', 'price', 'confidence'],
      {
        providers: [provider],
        symbol: symbol.toUpperCase(),
        chainId: chain ? (BLOCKCHAIN_TO_CHAIN_ID[chain] ?? 0) : undefined,
        successOnly: true,
        ascending: true,
        inclusiveBefore: true,
        limit,
      }
    );

    const prices = rows
      .map((row) => snapshotToPriceData(row, chain))
      .filter((price): price is PriceData => price !== null);
    return prices.length > 0 ? prices : null;
  } catch (error) {
    logger.error('Failed to get historical price snapshots', normalizeError(error));
    return null;
  }
}

async function saveRecordsToTurso(records: PriceRecordInsert[]): Promise<number> {
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  const saved = await insertTursoPriceRecords(client, records);
  await deleteExpiredTursoPriceRecords(client);
  return saved;
}

/**
 * `supabase` keeps the legacy single-store write. `shadow` writes both but
 * still reports the Supabase count, so callers and tests see today's result.
 * `turso` writes Turso first and falls back to Supabase on any failure; a
 * cache write must never be lost just because the new store is unavailable.
 */
async function saveRecordsWithMode(records: PriceRecordInsert[]): Promise<number> {
  const mode = readTursoPriceRecordsMode();
  if (mode === 'supabase') {
    return getAdminQueries().savePriceRecords(records);
  }
  if (mode === 'shadow') {
    const supabase = getAdminQueries().savePriceRecords(records);
    const turso = saveRecordsToTurso(records).catch((error: unknown) => {
      logger.warn('Shadow price_records write to Turso failed', normalizeError(error));
      return 0;
    });
    const [saved] = await Promise.all([supabase, turso]);
    return saved;
  }
  try {
    return await saveRecordsToTurso(records);
  } catch (error) {
    logger.error(
      'Turso price_records write failed; falling back to Supabase',
      normalizeError(error)
    );
    return getAdminQueries().savePriceRecords(records);
  }
}

export async function savePriceToDatabase(priceData: PriceData): Promise<boolean> {
  if (!shouldUseDatabase()) {
    return false;
  }

  try {
    const record = priceDataToRecord(priceData);
    return (await saveRecordsWithMode([record])) === 1;
  } catch (error) {
    logger.error('Failed to save price to database', normalizeError(error));
    return false;
  }
}

/** Preserve rich short-term history, with one bounded write per batch. */
export async function savePricesToDatabase(prices: PriceData[]): Promise<number> {
  if (!shouldUseDatabase()) return 0;
  const records = prices
    .filter((price) => supportsPricePersistence(price.provider))
    .map(priceDataToRecord);
  return saveRecordsWithMode(records);
}

export async function getPriceFromDatabase(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
): Promise<PriceData | null> {
  if (!shouldUseDatabase()) {
    return null;
  }

  const mode = readTursoPriceRecordsMode();
  const fallbackOnMiss = readTursoPriceRecordsFallbackOnMiss();

  if (mode === 'turso') {
    try {
      const client = getTursoPriceClient();
      await ensureTursoPriceSchema(client);
      const record = await readTursoLatestPriceRecord(client, { provider, symbol, chain });
      if (record) return recordToPriceData(record);
      if (!fallbackOnMiss) return null;
    } catch (error) {
      logger.error('Turso price_records read failed', normalizeError(error));
      if (!fallbackOnMiss) return null;
    }
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
    const now = Date.now();
    const startTime = now - period * 60 * 60 * 1000;

    const loadRecords = async () => {
      if (readTursoPriceRecordsMode() !== 'turso') {
        return getAdminQueries().getPriceRecords({
          provider,
          symbol,
          chain,
          startTime,
          endTime: now,
          limit: period * 4,
        });
      }
      try {
        const client = getTursoPriceClient();
        await ensureTursoPriceSchema(client);
        const records = await listTursoPriceRecords(client, {
          provider,
          symbol,
          chain: chain ?? undefined,
          startTime,
          endTime: now,
          limit: period * 4,
        });
        if (records.length > 0 || !readTursoPriceRecordsFallbackOnMiss()) return records;
      } catch (error) {
        logger.error('Turso price_records history read failed', normalizeError(error));
        if (!readTursoPriceRecordsFallbackOnMiss()) return null;
      }
      // Only the first 24 hours after cutover can differ between the stores.
      return getAdminQueries().getPriceRecords({
        provider,
        symbol,
        chain,
        startTime,
        endTime: now,
        limit: period * 4,
      });
    };

    const [records, snapshots] = await Promise.all([
      loadRecords(),
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
