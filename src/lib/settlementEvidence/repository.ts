/**
 * Turso persistence for the settlement-evidence layer.
 *
 * Lives inside the same Turso database as the raw price stream (schema v6) so
 * a single scheduled job can read oracle-consensus snapshots and write
 * settlement tables with one client. All writes are idempotent upserts — a
 * retried or overlapping Actions run produces the same rows.
 */

import { getTursoPriceClient } from '@/lib/turso/price/client';
import { ensureTursoPriceSchema } from '@/lib/turso/price/schema';
import { createLogger } from '@/lib/utils/logger';

import { KRAKEN_CANDLE_INTERVAL_SECONDS, KRAKEN_CANDLE_VENUE } from './krakenCandles';
import {
  SettlementEvidencePayloadSchema,
  type SettlementCandle,
  type SettlementCandleMeta,
  type SettlementEvidencePack,
  type SettlementEvidencePayload,
  type SettlementEvidenceGrade,
  type SettlementMarketWatchRow,
  type SettlementOutcome,
  type SettlementVenue,
} from './types';

const logger = createLogger('SettlementRepository');

interface RawWatchRow {
  market_slug: string;
  gamma_id: string;
  question: string;
  asset: string;
  window_seconds: number | string;
  window_start_ms: number | string;
  window_end_ms: number | string;
  settlement_venue: string;
  resolution_source_url: string | null;
  closed: number | string;
  declared_outcome: string | null;
  outcome_prices_json: string | null;
  first_seen_ms: number | string;
  updated_at_ms: number | string;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapWatchRow(row: RawWatchRow): SettlementMarketWatchRow {
  return {
    marketSlug: row.market_slug,
    gammaId: row.gamma_id,
    question: row.question,
    asset: row.asset,
    windowSeconds: toNumber(row.window_seconds) ?? 0,
    windowStartMs: toNumber(row.window_start_ms) ?? 0,
    windowEndMs: toNumber(row.window_end_ms) ?? 0,
    settlementVenue: row.settlement_venue as SettlementVenue,
    resolutionSourceUrl: row.resolution_source_url,
    closed: Number(row.closed) === 1,
    declaredOutcome: (row.declared_outcome as SettlementOutcome | null) ?? null,
    outcomePricesJson: row.outcome_prices_json,
    firstSeenMs: toNumber(row.first_seen_ms) ?? 0,
    updatedAtMs: toNumber(row.updated_at_ms) ?? 0,
  };
}

export async function ensureSettlementEvidenceSchema(): Promise<void> {
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
}

export async function upsertWatchMarkets(rows: SettlementMarketWatchRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  // first_seen_ms is preserved across updates by referencing the existing row.
  const statements = rows.map((row) => ({
    sql: `INSERT INTO settlement_market_watch (
            market_slug, gamma_id, question, asset, window_seconds,
            window_start_ms, window_end_ms, settlement_venue, resolution_source_url,
            closed, declared_outcome, outcome_prices_json, first_seen_ms, updated_at_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (market_slug) DO UPDATE SET
            gamma_id = excluded.gamma_id,
            question = excluded.question,
            asset = excluded.asset,
            window_seconds = excluded.window_seconds,
            window_start_ms = excluded.window_start_ms,
            window_end_ms = excluded.window_end_ms,
            settlement_venue = excluded.settlement_venue,
            resolution_source_url = excluded.resolution_source_url,
            closed = excluded.closed,
            declared_outcome = COALESCE(excluded.declared_outcome, settlement_market_watch.declared_outcome),
            outcome_prices_json = excluded.outcome_prices_json,
            updated_at_ms = excluded.updated_at_ms`,
    args: [
      row.marketSlug,
      row.gammaId,
      row.question,
      row.asset,
      row.windowSeconds,
      row.windowStartMs,
      row.windowEndMs,
      row.settlementVenue,
      row.resolutionSourceUrl,
      row.closed ? 1 : 0,
      row.declaredOutcome,
      row.outcomePricesJson,
      row.firstSeenMs,
      row.updatedAtMs,
    ],
  }));
  await client.batch(statements, 'write');
  return rows.length;
}

/** Watched markets whose window ended within the lookback horizon — the
 *  candle-collection and evidence candidates. */
export async function listRecentlySettledWatchMarkets(
  nowMs: number,
  lookbackMs: number
): Promise<SettlementMarketWatchRow[]> {
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  const result = await client.execute({
    sql: `SELECT * FROM settlement_market_watch
          WHERE window_end_ms >= ? AND window_end_ms <= ?
          ORDER BY window_end_ms ASC`,
    args: [nowMs - lookbackMs, nowMs],
  });
  return result.rows.map((row) => mapWatchRow(row as unknown as RawWatchRow));
}

export async function getWatchMarket(slug: string): Promise<SettlementMarketWatchRow | null> {
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  const result = await client.execute({
    sql: 'SELECT * FROM settlement_market_watch WHERE market_slug = ?',
    args: [slug],
  });
  return result.rows.length > 0 ? mapWatchRow(result.rows[0] as unknown as RawWatchRow) : null;
}

export interface UpsertCandlesInput {
  marketSlug: string;
  meta: SettlementCandleMeta;
  candles: SettlementCandle[];
  nowMs: number;
}

export async function upsertSettlementCandles({
  marketSlug,
  meta,
  candles,
  nowMs,
}: UpsertCandlesInput): Promise<number> {
  if (candles.length === 0) return 0;
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  const statements = candles.map((candle) => ({
    sql: `INSERT INTO settlement_window_candles (
            market_slug, venue, interval_seconds, bucket_ts,
            open, high, low, close, volume,
            rights_scope, delivery_policy, collected_at_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (market_slug, venue, interval_seconds, bucket_ts) DO NOTHING`,
    args: [
      marketSlug,
      meta.venue,
      meta.intervalSeconds,
      candle.bucketTs,
      String(candle.open),
      String(candle.high),
      String(candle.low),
      String(candle.close),
      candle.volume === null ? null : String(candle.volume),
      meta.rightsScope,
      meta.deliveryPolicy,
      nowMs,
    ],
  }));
  await client.batch(statements, 'write');
  return statements.length;
}

export async function getSettlementCandles(
  marketSlug: string,
  venue: string = KRAKEN_CANDLE_VENUE,
  intervalSeconds: number = KRAKEN_CANDLE_INTERVAL_SECONDS
): Promise<SettlementCandle[]> {
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  const result = await client.execute({
    sql: `SELECT bucket_ts, open, high, low, close, volume
          FROM settlement_window_candles
          WHERE market_slug = ? AND venue = ? AND interval_seconds = ?
          ORDER BY bucket_ts ASC`,
    args: [marketSlug, venue, intervalSeconds],
  });
  const candles: SettlementCandle[] = [];
  for (const row of result.rows) {
    const open = Number(row.open);
    const high = Number(row.high);
    const low = Number(row.low);
    const close = Number(row.close);
    const bucketTs = toNumber(row.bucket_ts as number);
    if (bucketTs === null || ![open, high, low, close].every(Number.isFinite)) continue;
    const volume = row.volume === null ? null : Number(row.volume);
    candles.push({
      bucketTs,
      open,
      high,
      low,
      close,
      volume: volume !== null && Number.isFinite(volume) ? volume : null,
    });
  }
  return candles;
}

export async function getCandleMeta(
  marketSlug: string
): Promise<{ rightsScope: string; deliveryPolicy: string; venue: string } | null> {
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  const result = await client.execute({
    sql: `SELECT venue, rights_scope, delivery_policy
          FROM settlement_window_candles WHERE market_slug = ? LIMIT 1`,
    args: [marketSlug],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    venue: String(row.venue),
    rightsScope: String(row.rights_scope),
    deliveryPolicy: String(row.delivery_policy),
  };
}

export interface OracleConsensusObservation {
  slotMs: number;
  consensusPrice: number;
}

/**
 * Oracle-consensus observations for one asset within a time range, read from
 * the platform's own raw snapshot stream. Returns one observation per slot
 * (the slot-level consensus is stored once per provider row; the median of
 * successful rows in the slot is already the consensus — we take the
 * highest-frequency consensus value per slot). Empty when the raw stream has
 * no coverage (e.g. legacy write mode) — the evidence engine treats that as
 * "oracle not available for this window", never as a verdict.
 */
export async function getOracleConsensusObservations(
  asset: string,
  fromMs: number,
  toMs: number
): Promise<OracleConsensusObservation[]> {
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  const result = await client.execute({
    sql: `SELECT slot_ms, consensus_price_e8
          FROM price_snapshots
          WHERE symbol = ? AND slot_ms >= ? AND slot_ms <= ?
            AND is_success = 1 AND consensus_price_e8 IS NOT NULL
          ORDER BY slot_ms ASC`,
    args: [asset.toUpperCase(), fromMs, toMs],
  });
  const bySlot = new Map<number, number[]>();
  for (const row of result.rows) {
    const slotMs = toNumber(row.slot_ms as number);
    const price = Number(row.consensus_price_e8 as string);
    if (slotMs === null || !Number.isFinite(price) || price <= 0) continue;
    // consensus_price_e8 is stored scaled by 1e8.
    const list = bySlot.get(slotMs) ?? [];
    list.push(price / 1e8);
    bySlot.set(slotMs, list);
  }
  return [...bySlot.entries()]
    .map(([slotMs, prices]) => ({
      slotMs,
      consensusPrice: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
    }))
    .sort((a, b) => a.slotMs - b.slotMs);
}

export interface PersistEvidencePackInput {
  pack: SettlementEvidencePack;
  grade: SettlementEvidenceGrade;
  nowMs: number;
}

export async function upsertEvidencePack({
  pack,
  grade,
  nowMs,
}: PersistEvidencePackInput): Promise<void> {
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  await client.execute({
    sql: `INSERT INTO settlement_evidence_packs (
            market_slug, schema_version, canonical_payload, payload_hash,
            uid, attester, signature, grade, created_at_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (market_slug) DO UPDATE SET
            schema_version = excluded.schema_version,
            canonical_payload = excluded.canonical_payload,
            payload_hash = excluded.payload_hash,
            uid = excluded.uid,
            attester = excluded.attester,
            signature = excluded.signature,
            grade = excluded.grade,
            created_at_ms = excluded.created_at_ms`,
    args: [
      pack.payload.marketSlug,
      pack.payload.schemaVersion,
      JSON.stringify(pack.payload),
      pack.payloadHash,
      pack.attestation?.uid ?? null,
      pack.attestation?.attester ?? null,
      pack.attestation?.signature ?? null,
      grade,
      nowMs,
    ],
  });
}

function mapStoredPack(row: Record<string, unknown>): SettlementEvidencePack & {
  grade: SettlementEvidenceGrade;
  createdAtMs: number;
} {
  const payload = SettlementEvidencePayloadSchema.parse(JSON.parse(String(row.canonical_payload)));
  return {
    payload,
    payloadHash: String(row.payload_hash),
    grade: String(row.grade) as SettlementEvidenceGrade,
    createdAtMs: toNumber(row.created_at_ms as number) ?? 0,
    attestation:
      row.uid && row.attester && row.signature
        ? {
            uid: String(row.uid),
            schemaVersion: 1,
            attester: String(row.attester),
            attesterLabel: 'Insight Settlement Evidence attester',
            signedAt: new Date(toNumber(row.created_at_ms as number) ?? 0).toISOString(),
            validForSeconds: 30 * 24 * 60 * 60,
            signature: String(row.signature),
            eip712: {
              domain: { name: 'Insight Settlement Evidence', version: '1', chainId: 1 },
              primaryType: 'SettlementEvidence',
            },
          }
        : null,
  };
}

export async function getEvidencePack(
  marketSlug: string
): Promise<
  (SettlementEvidencePack & { grade: SettlementEvidenceGrade; createdAtMs: number }) | null
> {
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  const result = await client.execute({
    sql: 'SELECT * FROM settlement_evidence_packs WHERE market_slug = ?',
    args: [marketSlug],
  });
  if (result.rows.length === 0) return null;
  try {
    return mapStoredPack(result.rows[0] as unknown as Record<string, unknown>);
  } catch (error) {
    logger.warn('Stored evidence pack failed schema validation', {
      marketSlug,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function listEvidencePacks(
  limit: number
): Promise<
  Array<SettlementEvidencePack & { grade: SettlementEvidenceGrade; createdAtMs: number }>
> {
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  const result = await client.execute({
    sql: 'SELECT * FROM settlement_evidence_packs ORDER BY created_at_ms DESC LIMIT ?',
    args: [Math.min(Math.max(limit, 1), 100)],
  });
  const packs: Array<
    SettlementEvidencePack & { grade: SettlementEvidenceGrade; createdAtMs: number }
  > = [];
  for (const row of result.rows) {
    try {
      packs.push(mapStoredPack(row as unknown as Record<string, unknown>));
    } catch (error) {
      logger.warn('Stored evidence pack failed schema validation', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return packs;
}

export interface EvidenceCandidate {
  row: SettlementMarketWatchRow;
  payload: SettlementEvidencePayload;
}

export async function listRecentEvidenceGrades(
  limit: number
): Promise<Array<{ marketSlug: string; grade: SettlementEvidenceGrade; createdAtMs: number }>> {
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  const result = await client.execute({
    sql: 'SELECT market_slug, grade, created_at_ms FROM settlement_evidence_packs ORDER BY created_at_ms DESC LIMIT ?',
    args: [Math.min(Math.max(limit, 1), 100)],
  });
  return result.rows.map((row) => ({
    marketSlug: String(row.market_slug),
    grade: String(row.grade) as SettlementEvidenceGrade,
    createdAtMs: toNumber(row.created_at_ms as number) ?? 0,
  }));
}
