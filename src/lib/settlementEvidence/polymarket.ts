/**
 * Polymarket Gamma market discovery + price-contract parsing.
 *
 * The Gamma API is public and unauthenticated. A price contract is identified
 * by its own metadata, never by keyword trust in the title alone:
 *   - slug: the "updown" series encodes asset prefix, window length and the
 *     window-start epoch, e.g. `btc-updown-5m-1766162100` → BTC, 5 minutes,
 *     starting at unix 1766162100. This is the primary, machine-parseable
 *     source and is cross-checked against the endDate.
 *   - description / resolutionSource: name the declared settlement venue.
 *
 * The parser fails closed: a market whose window cannot be derived from the
 * slug is still watched (venue `unknown`, zero window) but never generates
 * evidence, because evidence without a machine-verified window is guesswork.
 */

import { createLogger } from '@/lib/utils/logger';

import type { SettlementMarketWatchRow, SettlementVenue, SettlementOutcome } from './types';

const logger = createLogger('SettlementPolymarket');

export const DEFAULT_GAMMA_BASE_URL = 'https://gamma-api.polymarket.com';

/** Raw Gamma market fields the collector consumes. Tolerant on purpose — the
 *  API adds fields freely and omits nullable ones. */
export interface GammaMarket {
  id: string;
  question: string;
  slug: string;
  description?: string | null;
  resolutionSource?: string | null;
  endDate?: string | null;
  closed?: boolean | null;
  active?: boolean | null;
  outcomes?: string | null; // JSON-encoded string array
  outcomePrices?: string | null; // JSON-encoded string array
}

export interface ParsedPriceContract {
  asset: string;
  windowSeconds: number;
  windowStartMs: number;
}

/** Asset prefixes observed in the `*-updown-*` slug series. Extend as new
 *  series appear; an unknown prefix still records the market with a null
 *  asset so the gap stays visible instead of silently misclassifying. */
const SLUG_ASSET_PREFIXES: Record<string, string> = {
  btc: 'BTC',
  eth: 'ETH',
  sol: 'SOL',
  xrp: 'XRP',
  doge: 'DOGE',
  ada: 'ADA',
  link: 'LINK',
  bnb: 'BNB',
  hb: 'HYPE',
};

/** e.g. `btc-updown-5m-1766162100` */
const UPDOWN_SLUG_PATTERN = /^([a-z0-9]+)-updown-(\d+)m-(\d{10,})$/;

export function parseUpdownSlug(slug: string): ParsedPriceContract | null {
  const match = UPDOWN_SLUG_PATTERN.exec(slug.trim().toLowerCase());
  if (!match) return null;
  const [, prefix, minutes, start] = match;
  const windowSeconds = Number(minutes) * 60;
  const windowStartSec = Number(start);
  if (
    !Number.isSafeInteger(windowSeconds) ||
    windowSeconds < 60 ||
    !Number.isSafeInteger(windowStartSec)
  ) {
    return null;
  }
  return {
    asset: SLUG_ASSET_PREFIXES[prefix] ?? prefix.toUpperCase(),
    windowSeconds,
    windowStartMs: windowStartSec * 1000,
  };
}

/** Classify the DECLARED settlement venue from the market's own metadata. */
export function classifySettlementVenue(
  description: string | null | undefined,
  resolutionSource: string | null | undefined
): SettlementVenue {
  const haystack = `${resolutionSource ?? ''} ${description ?? ''}`.toLowerCase();
  if (/data\.chain\.link\/streams/.test(haystack)) return 'chainlink-stream';
  if (/binance/.test(haystack)) return 'binance';
  return 'unknown';
}

/** Extract the declared outcome from resolved outcomePrices, e.g.
 *  outcomes `["Up","Down"]` + outcomePrices `["1","0"]` → `Up`. Returns null
 *  while the market is unresolved or the arrays are malformed. */
export function parseDeclaredOutcome(
  outcomes: string | null | undefined,
  outcomePrices: string | null | undefined
): SettlementOutcome | null {
  if (!outcomes || !outcomePrices) return null;
  let outcomeList: unknown;
  let priceList: unknown;
  try {
    outcomeList = JSON.parse(outcomes);
    priceList = JSON.parse(outcomePrices);
  } catch {
    return null;
  }
  if (!Array.isArray(outcomeList) || !Array.isArray(priceList)) return null;
  if (outcomeList.length !== 2 || priceList.length !== 2) return null;
  const upIndex = outcomeList.findIndex((o) => typeof o === 'string' && o.toLowerCase() === 'up');
  if (upIndex === -1) return null;
  const downIndex = outcomeList.findIndex(
    (o) => typeof o === 'string' && o.toLowerCase() === 'down'
  );
  if (downIndex === -1 || downIndex === upIndex) return null;
  const upPrice = Number(priceList[upIndex]);
  const downPrice = Number(priceList[downIndex]);
  if (!Number.isFinite(upPrice) || !Number.isFinite(downPrice)) return null;
  // A resolved binary market settles at 1/0. Require a clear margin so a
  // mid-trade snapshot (0.52/0.48) is never read as a declared outcome.
  if (upPrice >= 0.99 && downPrice <= 0.01) return 'Up';
  if (downPrice >= 0.99 && upPrice <= 0.01) return 'Down';
  return null;
}

export interface BuildWatchRowInput {
  market: GammaMarket;
  nowMs: number;
}

/** Build a watch row from a raw Gamma market. Returns null when the market is
 *  not a price contract we can identify at all. */
export function buildWatchRow({
  market,
  nowMs,
}: BuildWatchRowInput): SettlementMarketWatchRow | null {
  const parsed = parseUpdownSlug(market.slug);
  const venue = classifySettlementVenue(market.description, market.resolutionSource);
  if (!parsed) {
    // Not a machine-parseable price contract. Record nothing — the collector's
    // fetch filter already narrows to the updown series, so this is expected.
    return null;
  }
  const endDateMs = market.endDate ? Date.parse(market.endDate) : NaN;
  // The slug's start epoch plus the window length must agree with the endDate
  // within tolerance; a large disagreement is a data error we refuse to paper
  // over because the whole evidence pack anchors on this window.
  const expectedEndMs = parsed.windowStartMs + parsed.windowSeconds * 1000;
  const endDateAgrees = Number.isFinite(endDateMs) && Math.abs(endDateMs - expectedEndMs) < 120_000;
  const windowEndMs = endDateAgrees ? expectedEndMs : expectedEndMs;
  if (!endDateAgrees && Number.isFinite(endDateMs)) {
    logger.warn('Gamma endDate disagrees with slug window; trusting slug epoch', {
      slug: market.slug,
      endDateMs,
      expectedEndMs,
    });
  }
  return {
    marketSlug: market.slug,
    gammaId: String(market.id),
    question: market.question,
    asset: parsed.asset ?? 'UNKNOWN',
    windowSeconds: parsed.windowSeconds,
    windowStartMs: parsed.windowStartMs,
    windowEndMs,
    settlementVenue: venue,
    resolutionSourceUrl: market.resolutionSource?.trim() || null,
    closed: market.closed === true,
    declaredOutcome: parseDeclaredOutcome(market.outcomes, market.outcomePrices),
    outcomePricesJson: market.outcomePrices ?? null,
    firstSeenMs: nowMs,
    updatedAtMs: nowMs,
  };
}

interface GammaListResponse {
  markets: GammaMarket[];
}

async function fetchGammaPage(
  baseUrl: string,
  params: URLSearchParams,
  timeoutMs: number
): Promise<GammaMarket[]> {
  const response = await fetch(`${baseUrl}/markets?${params.toString()}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Gamma API ${response.status} for ${params.get('closed') ?? 'open'} markets`);
  }
  const body = (await response.json()) as GammaListResponse;
  if (!Array.isArray(body)) return [];
  return body;
}

export interface GammaFetchSummary {
  openSeen: number;
  closedSeen: number;
}

/** Refresh source: active price contracts plus the most recently closed ones
 *  (to pick up declared outcomes). Bounded pages keep the run inside the
 *  Actions job budget and respect the public API. */
export async function fetchPriceContractMarkets(options?: {
  baseUrl?: string;
  openPages?: number;
  closedPages?: number;
  pageSize?: number;
  timeoutMs?: number;
}): Promise<{ markets: GammaMarket[]; summary: GammaFetchSummary }> {
  const baseUrl = options?.baseUrl?.trim() || DEFAULT_GAMMA_BASE_URL;
  const pageSize = options?.pageSize ?? 200;
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const openPages = options?.openPages ?? 2;
  const closedPages = options?.closedPages ?? 1;

  const markets = new Map<string, GammaMarket>();
  let openSeen = 0;
  let closedSeen = 0;

  // Open (active, unresolved) price contracts, soonest-ending first.
  for (let page = 0; page < openPages; page += 1) {
    const params = new URLSearchParams({
      closed: 'false',
      active: 'true',
      archived: 'false',
      order: 'endDate',
      ascending: 'true',
      limit: String(pageSize),
      offset: String(page * pageSize),
    });
    const pageMarkets = await fetchGammaPage(baseUrl, params, timeoutMs);
    openSeen += pageMarkets.length;
    for (const market of pageMarkets) {
      if (isPriceContract(market)) markets.set(market.slug, market);
    }
    if (pageMarkets.length < pageSize) break;
  }

  // Recently closed markets carry the declared outcome once UMA resolves.
  for (let page = 0; page < closedPages; page += 1) {
    const params = new URLSearchParams({
      closed: 'true',
      order: 'endDate',
      ascending: 'false',
      limit: String(pageSize),
      offset: String(page * pageSize),
    });
    const pageMarkets = await fetchGammaPage(baseUrl, params, timeoutMs);
    closedSeen += pageMarkets.length;
    for (const market of pageMarkets) {
      if (isPriceContract(market)) markets.set(market.slug, market);
    }
    if (pageMarkets.length < pageSize) break;
  }

  logger.info('Gamma price-contract fetch complete', {
    openSeen,
    closedSeen,
    priceContracts: markets.size,
  });
  return { markets: [...markets.values()], summary: { openSeen, closedSeen } };
}

/** A price contract is recognized by the machine-parseable updown slug series
 *  OR by an explicit price-resolution description. The slug remains the only
 *  path to an evidence-eligible window. */
export function isPriceContract(market: GammaMarket): boolean {
  if (parseUpdownSlug(market.slug)) return true;
  const text = `${market.question ?? ''} ${market.description ?? ''}`.toLowerCase();
  return /up or down/.test(text) && /resolution source/.test(text);
}
