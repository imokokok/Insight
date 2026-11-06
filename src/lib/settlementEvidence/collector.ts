/**
 * Settlement-evidence collector — the scheduled orchestration.
 *
 * One Actions run (every 15 minutes alongside the snapshot pipeline):
 *   1. refresh the watch list from the public Polymarket Gamma API,
 *   2. collect independent Kraken 1-minute candles for windows that ended
 *      within the lookback horizon (public OHLC keeps ~720 minutes),
 *   3. build + sign evidence packs for markets whose declared outcome is now
 *      known, using stored candles and the platform's own oracle-consensus
 *      snapshots.
 *
 * Steps are isolated: a Gamma outage must not stop candle collection, and a
 * Kraken outage must not stop evidence for already-collected windows. The
 * rights register is the gate for every venue request (fail-closed).
 */

import type { AttesterAccount } from '@/lib/attestations/attesterAccount';
import { createLogger } from '@/lib/utils/logger';

import { sendInconsistentAlerts, type InconsistentAlert } from './alerts';
import { buildEvidencePayload, assembleEvidencePack, logGradedEvidence } from './engine';
import {
  fetchSettlementWindowCandles,
  krakenDeliveryPolicy,
  krakenRightsScope,
  type FetchWindowCandlesResult,
} from './krakenCandles';
import { buildWatchRow, fetchPriceContractMarkets, type GammaMarket } from './polymarket';
import {
  ensureSettlementEvidenceSchema,
  getCandleMeta,
  getEvidencePack,
  getOracleConsensusObservations,
  getSettlementCandles,
  getWatchMarket,
  listRecentlySettledWatchMarkets,
  upsertEvidencePack,
  upsertSettlementCandles,
  upsertWatchMarkets,
} from './repository';
import { signSettlementEvidence } from './signing';

import type {
  SettlementCandleMeta,
  SettlementEvidenceGrade,
  SettlementEvidencePack,
  SettlementEvidencePayload,
  SettlementMarketWatchRow,
} from './types';

const logger = createLogger('SettlementEvidenceCollector');

export const DEFAULT_LOOKBACK_HOURS = 12;

/** Kraken's public OHLC response holds ~720 one-minute candles; leave slack. */
const MAX_CANDLE_WINDOW_MS = 11 * 60 * 60 * 1000;

/** A resolved window is only graded once the market has had time to resolve. */
const RESOLUTION_GRACE_MS = 10 * 60 * 1000;

/**
 * An unresolved market whose window ended more than one lookback horizon ago
 * is treated as abandoned by the venue and excluded from the watch list.
 */
export const STALE_UNRESOLVED_WATCH_MS = DEFAULT_LOOKBACK_HOURS * 60 * 60 * 1000;

export interface CollectSettlementEvidenceOptions {
  nowMs?: number;
  lookbackMs?: number;
  gammaBaseUrl?: string;
  attester?: AttesterAccount | null;
}

export interface CollectSettlementEvidenceResult {
  watchUpserted: number;
  candleMarkets: number;
  candlesUpserted: number;
  packsBuilt: number;
  packsSigned: number;
  grades: Record<string, number>;
  alertsSent: number;
}

/**
 * Refresh the watch list from Gamma and persist watch rows. Never throws for
 * an upstream outage — returns 0 rows refreshed so the remaining steps still
 * run against the previously persisted watch list.
 */
export async function refreshWatchList(options: CollectSettlementEvidenceOptions): Promise<number> {
  const nowMs = options.nowMs ?? Date.now();
  let markets: GammaMarket[];
  try {
    ({ markets } = await fetchPriceContractMarkets({ baseUrl: options.gammaBaseUrl }));
  } catch (error) {
    logger.warn('Gamma refresh failed; keeping previous watch list', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
  const rows = markets
    .map((market) => buildWatchRow({ market, nowMs }))
    .filter((row): row is SettlementMarketWatchRow => row !== null);

  // Gamma keeps abandoned price-contract series listed as open forever (a
  // live probe in Nov 2026 found 55 unclosed `*-updown-*` markets whose
  // windows ended months earlier, all zero-volume, none ever closing). Such
  // rows would sit in the watch list permanently, never settle, and pollute
  // the paid endpoint's addressable inventory. A legitimate market can stay
  // open past its window only while the venue resolves it, so anything
  // unclosed one lookback horizon past its window end is treated as stale.
  let staleSkipped = 0;
  const liveRows: SettlementMarketWatchRow[] = [];
  for (const row of rows) {
    if (!row.closed && row.windowEndMs + STALE_UNRESOLVED_WATCH_MS < nowMs) {
      staleSkipped += 1;
      continue;
    }
    liveRows.push(row);
  }
  if (staleSkipped > 0) {
    logger.info('Skipped stale unresolved watch markets (window ended, never closed)', {
      staleSkipped,
      parsed: rows.length,
      persisted: liveRows.length,
    });
  }
  return upsertWatchMarkets(liveRows);
}

/**
 * Collect candles for every watched market whose window ended within the
 * lookback horizon. Returns the number of markets for which at least one new
 * candle batch was persisted.
 */
export async function collectWindowCandles(
  options: CollectSettlementEvidenceOptions
): Promise<{ markets: number; candles: number }> {
  const nowMs = options.nowMs ?? Date.now();
  const lookbackMs = options.lookbackMs ?? DEFAULT_LOOKBACK_HOURS * 60 * 60 * 1000;
  const rows = await listRecentlySettledWatchMarkets(nowMs, lookbackMs);

  let candleMarkets = 0;
  let candlesUpserted = 0;
  for (const row of rows) {
    if (nowMs - row.windowStartMs > MAX_CANDLE_WINDOW_MS) continue;
    let result: FetchWindowCandlesResult;
    try {
      result = await fetchSettlementWindowCandles({
        asset: row.asset,
        windowStartMs: row.windowStartMs,
        windowEndMs: row.windowEndMs,
        nowMs,
      });
    } catch (error) {
      logger.warn('Unexpected candle fetch failure; grading will mark unavailable', {
        marketSlug: row.marketSlug,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    if (result.unavailableReason !== null) {
      logger.info('Candles unavailable', {
        marketSlug: row.marketSlug,
        reason: result.unavailableReason,
      });
      continue;
    }
    const meta: SettlementCandleMeta = {
      venue: result.venue,
      intervalSeconds: result.intervalSeconds,
      rightsScope: krakenRightsScope(),
      deliveryPolicy: krakenDeliveryPolicy(),
    };
    const upserted = await upsertSettlementCandles({
      marketSlug: row.marketSlug,
      meta,
      candles: result.candles,
      nowMs,
    });
    if (upserted > 0) candleMarkets += 1;
    candlesUpserted += upserted;
  }
  return { markets: candleMarkets, candles: candlesUpserted };
}

/**
 * Grade one settled watch row: build the payload, sign it, persist the pack,
 * and return the artifacts the caller needs for alerting/counters. Throws on
 * infrastructure failure — the scheduled loop catches per-market so one bad
 * window never blocks the rest.
 */
async function gradeAndPersistWatchRow(
  row: SettlementMarketWatchRow,
  options: CollectSettlementEvidenceOptions,
  nowMs: number
): Promise<{ pack: SettlementEvidencePack; payload: SettlementEvidencePayload; signed: boolean }> {
  const candles = await getSettlementCandles(row.marketSlug);
  const meta = await getCandleMeta(row.marketSlug);
  const oracleObservations = await getOracleConsensusObservations(
    row.asset,
    row.windowStartMs - 60 * 60 * 1000,
    row.windowEndMs + 60 * 60 * 1000
  );

  const payload = buildEvidencePayload({
    row,
    candles,
    candleSource: meta?.venue ?? null,
    candleRightsScope: (meta?.rightsScope as SettlementCandleMeta['rightsScope']) ?? null,
    candleDeliveryPolicy: meta?.deliveryPolicy ?? null,
    oracleObservations,
    nowMs,
  });
  const pack = assembleEvidencePack({ payload, attestation: null });
  const attestation = await signSettlementEvidence(
    payload,
    pack.payloadHash,
    options.attester ?? undefined
  );
  const signedPack = attestation ? { ...pack, attestation } : pack;

  await upsertEvidencePack({ pack: signedPack, grade: payload.grade, nowMs });
  logGradedEvidence(payload);
  return { pack: signedPack, payload, signed: attestation !== null };
}

/**
 * Build + persist + sign evidence packs for settled, RESOLVED windows in the
 * lookback horizon. Idempotent: rebuilding a window overwrites the stored pack
 * with the same derived analytics (generatedAtMs changes only on new grades).
 */
export async function buildAndPersistEvidencePacks(
  options: CollectSettlementEvidenceOptions
): Promise<{ built: number; signed: number; grades: Record<string, number>; alertsSent: number }> {
  const nowMs = options.nowMs ?? Date.now();
  const lookbackMs = options.lookbackMs ?? DEFAULT_LOOKBACK_HOURS * 60 * 60 * 1000;
  const rows = await listRecentlySettledWatchMarkets(nowMs, lookbackMs);

  const grades: Record<string, number> = {};
  const inconsistentAlerts: InconsistentAlert[] = [];
  let built = 0;
  let signed = 0;

  for (const row of rows) {
    // Skip windows that cannot have resolved yet.
    if (nowMs < row.windowEndMs + RESOLUTION_GRACE_MS) continue;
    // Evidence needs the market's declared outcome — an unresolved market has
    // nothing to compare against, and grading it would just be noise.
    if (!row.closed || row.declaredOutcome === null) continue;
    // Skip windows too old for the candle source; their pack (if any) is
    // already persisted and must not be downgraded to insufficient_data.
    if (nowMs - row.windowStartMs > MAX_CANDLE_WINDOW_MS) continue;

    try {
      const {
        pack,
        payload,
        signed: isSigned,
      } = await gradeAndPersistWatchRow(row, options, nowMs);
      built += 1;
      if (isSigned) signed += 1;
      grades[payload.grade] = (grades[payload.grade] ?? 0) + 1;
      if (payload.grade === 'inconsistent') {
        inconsistentAlerts.push({
          marketSlug: payload.marketSlug,
          asset: payload.asset,
          settlementVenue: payload.settlementVenue,
          declaredOutcome: payload.declaredOutcome,
          independentOutcome: payload.independentOutcome,
          priceChangeBps: payload.priceChangeBps,
          oracleDeviationBps: payload.oracleDeviationBps,
          candleCoverageE4: payload.candleCoverageE4,
          windowStartMs: payload.windowStartMs,
          windowEndMs: payload.windowEndMs,
          payloadHash: pack.payloadHash,
        });
      }
    } catch (error) {
      logger.warn('Evidence build failed for market; remaining markets continue', {
        marketSlug: row.marketSlug,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  // Best-effort notification AFTER persistence: the evidence is already
  // durable; a webhook outage only loses the ping, never the data.
  const alertsSent = await sendInconsistentAlerts(inconsistentAlerts);
  return { built, signed, grades, alertsSent };
}

/**
 * Why an on-demand grade could not (or did not need to) build a fresh pack.
 * These are caller-facing outcomes, not infrastructure errors.
 */
export type OnDemandEvidencePackOutcome =
  | { status: 'not_found'; reason: 'WATCH_MARKET_NOT_FOUND' }
  | { status: 'too_early'; reason: 'WINDOW_NOT_RESOLVED' }
  | { status: 'unresolved'; reason: 'MARKET_UNRESOLVED' }
  | { status: 'too_old'; reason: 'WINDOW_TOO_OLD' };

export interface OnDemandEvidencePackBuilt {
  status: 'built';
  pack: SettlementEvidencePack;
  grade: SettlementEvidenceGrade;
  signed: boolean;
}

export interface OnDemandEvidencePackCached {
  status: 'cached';
  pack: SettlementEvidencePack;
}

export type OnDemandEvidencePackResult =
  | OnDemandEvidencePackBuilt
  | OnDemandEvidencePackCached
  | OnDemandEvidencePackOutcome;

/**
 * On-demand grade for ONE market slug — the paid entry point behind
 * `POST /api/v1/markets/settlement-evidence/grade`. Mirrors the scheduled
 * `buildAndPersistEvidencePacks` gates exactly (grace, resolution, candle
 * window age) so a paid call and the cron run never disagree. Idempotent:
 * an existing persisted pack is returned as `cached` and is never downgraded
 * (a stale candle source must not turn an existing pack into
 * insufficient_data — same rule the cron path enforces by skipping).
 */
export async function buildOrFetchEvidencePackForSlug(
  slug: string,
  options: CollectSettlementEvidenceOptions = {}
): Promise<OnDemandEvidencePackResult> {
  const nowMs = options.nowMs ?? Date.now();

  const existing = await getEvidencePack(slug);
  if (existing) return { status: 'cached', pack: existing };

  const row = await getWatchMarket(slug);
  if (!row) return { status: 'not_found', reason: 'WATCH_MARKET_NOT_FOUND' };
  if (nowMs < row.windowEndMs + RESOLUTION_GRACE_MS) {
    return { status: 'too_early', reason: 'WINDOW_NOT_RESOLVED' };
  }
  if (!row.closed || row.declaredOutcome === null) {
    return { status: 'unresolved', reason: 'MARKET_UNRESOLVED' };
  }
  if (nowMs - row.windowStartMs > MAX_CANDLE_WINDOW_MS) {
    return { status: 'too_old', reason: 'WINDOW_TOO_OLD' };
  }

  const { pack, payload, signed } = await gradeAndPersistWatchRow(row, options, nowMs);
  if (payload.grade === 'inconsistent') {
    // Same discipline as the scheduled path: alert after persistence, best-effort.
    await sendInconsistentAlerts([
      {
        marketSlug: payload.marketSlug,
        asset: payload.asset,
        settlementVenue: payload.settlementVenue,
        declaredOutcome: payload.declaredOutcome,
        independentOutcome: payload.independentOutcome,
        priceChangeBps: payload.priceChangeBps,
        oracleDeviationBps: payload.oracleDeviationBps,
        candleCoverageE4: payload.candleCoverageE4,
        windowStartMs: payload.windowStartMs,
        windowEndMs: payload.windowEndMs,
        payloadHash: pack.payloadHash,
      },
    ]);
  }
  return { status: 'built', pack, grade: payload.grade, signed };
}

export async function collectSettlementEvidence(
  options: CollectSettlementEvidenceOptions = {}
): Promise<CollectSettlementEvidenceResult> {
  await ensureSettlementEvidenceSchema();
  const watchUpserted = await refreshWatchList(options);
  const candles = await collectWindowCandles(options);
  const packs = await buildAndPersistEvidencePacks(options);
  logger.info('Settlement-evidence collection complete', {
    watchUpserted,
    candleMarkets: candles.markets,
    candlesUpserted: candles.candles,
    packsBuilt: packs.built,
    packsSigned: packs.signed,
    grades: packs.grades,
    alertsSent: packs.alertsSent,
  });
  return {
    watchUpserted,
    candleMarkets: candles.markets,
    candlesUpserted: candles.candles,
    packsBuilt: packs.built,
    packsSigned: packs.signed,
    grades: packs.grades,
    alertsSent: packs.alertsSent,
  };
}
