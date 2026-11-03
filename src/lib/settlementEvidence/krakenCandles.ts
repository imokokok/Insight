/**
 * Kraken settlement-window candle collector.
 *
 * Kraken is the only CEX in Insight's source-rights register with a reviewed
 * vendor permission (vendor-licensed, derived-analytics-only — see
 * `MARKET_REFERENCE_SOURCE_RIGHTS.kraken`). The collector fails closed: if the
 * register ever revokes or downgrades that permission, no Kraken request is
 * made and candles are marked unavailable instead of being sourced elsewhere.
 *
 * Kraken's public OHLC endpoint returns up to 720 one-minute candles. A
 * collector cadence of ≤ 6 hours therefore guarantees full window coverage;
 * the scheduled job runs every 15 minutes alongside the snapshot pipeline.
 */

import {
  MARKET_REFERENCE_SOURCE_RIGHTS,
  type EvidenceRightsScope,
} from '@/lib/dataRights/evidenceRights';
import { createLogger } from '@/lib/utils/logger';

import type { SettlementCandle } from './types';

const logger = createLogger('SettlementKrakenCandles');

export const KRAKEN_CANDLE_VENUE = 'kraken';
export const KRAKEN_CANDLE_INTERVAL_SECONDS = 60;

/** Public OHLC endpoint limit per response. */
export const KRAKEN_OHLC_MAX_CANDLES = 720;

/** Canonical Kraken pair names (verified against the live API, matching the
 *  market-reference collector's mapping). Kraken normalizes aliases and keys
 *  the response by the canonical name. */
const KRAKEN_PAIRS: Record<string, string> = {
  BTC: 'XXBTZUSD',
  ETH: 'XETHZUSD',
  SOL: 'SOLUSD',
  XRP: 'XRPUSD',
  ADA: 'ADAUSD',
  DOGE: 'DOGEUSD',
  LINK: 'LINKUSD',
  USDC: 'USDCUSD',
  USDT: 'USDTZUSD',
};

export function krakenPairForAsset(asset: string): string | null {
  return KRAKEN_PAIRS[asset.toUpperCase()] ?? null;
}

/**
 * Whether the current source-rights register permits COLLECTING this venue for
 * Insight's own settlement analysis. Distinct from customer delivery: the
 * register keeps kraken at `derived-analytics-only`, so raw candles stay
 * internal no matter what this returns.
 */
export function collectionPermittedForVenue(
  venue: string,
  rights: Readonly<
    Record<string, { rightsScope: EvidenceRightsScope }>
  > = MARKET_REFERENCE_SOURCE_RIGHTS
): boolean {
  const entry = rights[venue];
  if (!entry) return false;
  // research-quarantined sources may never be contacted; not-authorized
  // entries have no reviewed permission at all.
  return entry.rightsScope === 'vendor-licensed' || entry.rightsScope === 'customer-authorized';
}

export function krakenRightsScope(): EvidenceRightsScope {
  return MARKET_REFERENCE_SOURCE_RIGHTS.kraken.rightsScope;
}

export function krakenDeliveryPolicy(): string {
  return MARKET_REFERENCE_SOURCE_RIGHTS.kraken.deliveryPolicy;
}

interface KrakenOhlcResult {
  error: unknown[];
  result?: Record<string, unknown>;
}

type KrakenOhlcRow = [number, string, string, string, string, string, string, number];

function parseCandleRow(row: KrakenOhlcRow): SettlementCandle | null {
  const [bucketTs, open, high, low, close, , volume] = row;
  const values = [open, high, low, close].map(Number);
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) return null;
  const parsedVolume = Number(volume);
  return {
    bucketTs,
    open: values[0],
    high: values[1],
    low: values[2],
    close: values[3],
    volume: Number.isFinite(parsedVolume) ? parsedVolume : null,
  };
}

export interface FetchWindowCandlesInput {
  asset: string;
  windowStartMs: number;
  windowEndMs: number;
  baseUrl?: string;
  timeoutMs?: number;
  nowMs?: number;
}

export interface FetchWindowCandlesResult {
  venue: string;
  intervalSeconds: number;
  candles: SettlementCandle[];
  /** Null when collection was attempted and succeeded. */
  unavailableReason: string | null;
}

/**
 * Fetch 1-minute candles covering [windowStartMs, windowEndMs] (inclusive of
 * the opening bucket). Returns an explicit `unavailableReason` instead of
 * throwing when the venue cannot or may not be queried, so the evidence engine
 * can grade the window as `insufficient_data` rather than failing the run.
 */
export async function fetchSettlementWindowCandles({
  asset,
  windowStartMs,
  windowEndMs,
  baseUrl = 'https://api.kraken.com',
  timeoutMs = 15_000,
  nowMs = Date.now(),
}: FetchWindowCandlesInput): Promise<FetchWindowCandlesResult> {
  const unavailable = (reason: string): FetchWindowCandlesResult => ({
    venue: KRAKEN_CANDLE_VENUE,
    intervalSeconds: KRAKEN_CANDLE_INTERVAL_SECONDS,
    candles: [],
    unavailableReason: reason,
  });

  if (!collectionPermittedForVenue(KRAKEN_CANDLE_VENUE)) {
    return unavailable('source_rights_forbid_collection');
  }
  const pair = krakenPairForAsset(asset);
  if (!pair) return unavailable('asset_has_no_kraken_pair');
  if (windowEndMs > nowMs) {
    return unavailable('window_not_yet_complete');
  }
  // Beyond the public endpoint's 720-candle horizon the fetch would silently
  // return a truncated window — refuse and grade insufficient_data instead.
  if (nowMs - windowStartMs > KRAKEN_OHLC_MAX_CANDLES * 60_000) {
    return unavailable('window_outside_kraken_ohlc_horizon');
  }

  const sinceSeconds = Math.floor(windowStartMs / 1000) - 60;
  let body: KrakenOhlcResult;
  try {
    const response = await fetch(
      `${baseUrl}/0/public/OHLC?pair=${encodeURIComponent(pair)}&interval=1&since=${sinceSeconds}`,
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) }
    );
    if (!response.ok) return unavailable(`kraken_http_${response.status}`);
    body = (await response.json()) as KrakenOhlcResult;
  } catch (error) {
    logger.warn('Kraken OHLC request failed', {
      asset,
      error: error instanceof Error ? error.message : String(error),
    });
    return unavailable('kraken_request_failed');
  }
  if (Array.isArray(body.error) && body.error.length > 0) {
    return unavailable(`kraken_api_error:${body.error.join(';').slice(0, 200)}`);
  }

  const result = body.result ?? {};
  const rowsKey = Object.keys(result).find((key) => key !== 'last');
  if (!rowsKey || !Array.isArray(result[rowsKey])) return unavailable('kraken_empty_response');

  const windowStartSec = Math.floor(windowStartMs / 1000);
  const windowEndSec = Math.floor(windowEndMs / 1000);
  const candles: SettlementCandle[] = [];
  for (const row of result[rowsKey] as KrakenOhlcRow[]) {
    if (!Array.isArray(row) || row.length < 8) continue;
    const bucketTs = Number(row[0]);
    if (!Number.isSafeInteger(bucketTs) || bucketTs < windowStartSec || bucketTs >= windowEndSec) {
      continue;
    }
    const candle = parseCandleRow(row);
    if (candle) candles.push(candle);
  }
  candles.sort((a, b) => a.bucketTs - b.bucketTs);
  return {
    venue: KRAKEN_CANDLE_VENUE,
    intervalSeconds: KRAKEN_CANDLE_INTERVAL_SECONDS,
    candles,
    unavailableReason: null,
  };
}
