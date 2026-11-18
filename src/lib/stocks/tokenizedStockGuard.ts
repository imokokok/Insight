/**
 * Tokenized Stock Guard: pre-signing decision-input check for one
 * Coinbase-tokenized stock (B20) on Base, evaluated against the issuer's
 * official NAV reference.
 *
 * Rule sources (Base official docs, fetched 2026-11-15):
 *   https://docs.base.org/build-on-base/integrate-defi/list-tokenized-stocks
 *   - "During market hours the feed updates on a 0.5% price deviation or at
 *     least every 24 hours (its heartbeat)."
 *   - "Off-hours (nights, weekends, holidays, and corporate-action pauses) it
 *     stops updating and holds the last value."
 *   - "Always read updatedAt and apply staleness bounds before relying on the
 *     price; never settle or liquidate against a frozen feed."
 *   - "nav_price is not a live bid/ask or execution price."
 *
 * This is a separate staleness lane from the crypto oracle assessment: the
 * existing pre-trade gate enforces a 300-second quote age, which is correct
 * for 24/7 crypto feeds and wrong for equities whose reference is DESIGNED
 * to freeze off-hours. Verdicts:
 *   ALLOW         fresh reference, market open, inputs consistent (single-source, see limitations)
 *   WAIT          frozen reference off-hours: trading may proceed, settlement/liquidation must not
 *   BLOCK         an explicit disqualifying condition
 *   NOT_PRICEABLE the issuer publishes no NAV for this token (absent is not zero)
 *
 * The guard never signs, submits, or authorizes a transaction.
 */

import { z } from 'zod';

import {
  defaultTokenizedStocksClient,
  type TokenizedStockQuote,
  type TokenizedStocksClient,
} from './tokenizedStocksClient';

export const TOKENIZED_STOCK_GUARD_SCHEMA = 'insight.tokenized-stock-guard.v1' as const;
/** Tokenized stocks (B20) are Base-native assets; the guard evaluates them as such. */
export const TOKENIZED_STOCK_GUARD_CHAIN_ID = 8453 as const;
export const DEFAULT_MAX_DEVIATION_BPS = 1000;
export const NAV_HEARTBEAT_SECONDS = 24 * 60 * 60;

const SETTLEMENT_SENSITIVE_ACTIONS = new Set(['borrow', 'liquidate']);

export type TokenizedStockAction = 'swap' | 'borrow' | 'lend' | 'liquidate' | 'repay';
export type TokenizedStockVerdict = 'ALLOW' | 'WAIT' | 'BLOCK' | 'NOT_PRICEABLE';
export type TokenizedStockActionability =
  | 'SETTLEMENT_SAFE'
  | 'TRADE_ONLY'
  | 'DO_NOT_USE'
  | 'NO_PRICE';

export const TokenizedStockGuardInputSchema = z
  .object({
    asset: z
      .string()
      .trim()
      .min(2)
      .max(12)
      .regex(/^[A-Za-z][A-Za-z0-9]{1,11}$/),
    action: z.enum(['swap', 'borrow', 'lend', 'liquidate', 'repay']),
    tradeAmountUsd: z.number().finite().positive(),
    decisionPriceUsd: z.number().finite().positive().optional(),
    maxDeviationBps: z.number().int().min(0).max(10_000).optional(),
  })
  .strict();

export type TokenizedStockGuardInput = z.infer<typeof TokenizedStockGuardInputSchema>;

// ---------------------------------------------------------------------------
// US equity market calendar (approximate; see limitations).
// Session times in UTC: EST 14:30-21:00, EDT 13:30-20:00.
// ---------------------------------------------------------------------------

// Standard NYSE holiday rules for 2026. MUST be re-checked against the
// official exchange calendar for any year outside 2026 (see limitations).
const HOLIDAYS_2026 = new Set([
  '2026-01-01', // New Year's Day
  '2026-01-19', // Martin Luther King Jr. Day
  '2026-02-16', // Washington's Birthday
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day (observed, Jul 4 is Saturday)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving Day
  '2026-12-25', // Christmas Day
]);

const MS_DAY = 24 * 60 * 60 * 1000;

function usDSTStart(year: number): Date {
  // Second Sunday of March, 2:00 local (EST) -> 07:00 UTC
  const d = new Date(Date.UTC(year, 2, 1));
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7) + 7);
  d.setUTCHours(7, 0, 0, 0);
  return d;
}

function usDSTEnd(year: number): Date {
  // First Sunday of November, 2:00 local (was EDT) -> 06:00 UTC
  const d = new Date(Date.UTC(year, 10, 1));
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7));
  d.setUTCHours(6, 0, 0, 0);
  return d;
}

function sessionWindowUtc(date: Date): { openH: number; closeH: number } {
  const year = date.getUTCFullYear();
  const dst = date >= usDSTStart(year) && date < usDSTEnd(year);
  return dst ? { openH: 13.5, closeH: 20 } : { openH: 14.5, closeH: 21 };
}

export interface MarketStatus {
  open: boolean;
  because: 'weekend' | 'holiday' | 'pre_market' | 'after_hours' | null;
}

export function marketStatus(now: Date): MarketStatus {
  const ymd = now.toISOString().slice(0, 10);
  const dow = now.getUTCDay();
  const { openH, closeH } = sessionWindowUtc(now);
  const openMs =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + openH * 3600 * 1000;
  const closeMs =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + closeH * 3600 * 1000;
  if (dow === 0 || dow === 6) return { open: false, because: 'weekend' };
  if (HOLIDAYS_2026.has(ymd)) return { open: false, because: 'holiday' };
  if (now.getTime() < openMs) return { open: false, because: 'pre_market' };
  if (now.getTime() >= closeMs) return { open: false, because: 'after_hours' };
  return { open: true, because: null };
}

/** Most recent regular-session close at or before `now` (UTC), or null. */
export function lastMarketClose(now: Date): number | null {
  let d = new Date(now.getTime());
  for (let i = 0; i < 10; i += 1) {
    const dow = d.getUTCDay();
    const ymd = d.toISOString().slice(0, 10);
    if (dow >= 1 && dow <= 5 && !HOLIDAYS_2026.has(ymd)) {
      const { closeH } = sessionWindowUtc(d);
      const closeMs =
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + closeH * 3600 * 1000;
      if (closeMs <= now.getTime()) return closeMs;
    }
    d = new Date(d.getTime() - MS_DAY);
  }
  return null;
}

function canonicalTokenPrice(quote: TokenizedStockQuote): number | null {
  const nav = quote.navPrice;
  if (nav === null || nav <= 0) return null;
  const multiplier = quote.multiplier ?? 1;
  const price = nav * multiplier;
  return Number.isFinite(price) && price > 0 ? price : null;
}

// ---------------------------------------------------------------------------
// Pure policy evaluation: everything below derives from the inputs only, so a
// third party can recompute the verdict offline and byte-compare it.
// ---------------------------------------------------------------------------

interface EvaluationInput {
  action: TokenizedStockAction;
  tradeAmountUsd: number;
  decisionPriceUsd?: number | undefined;
  maxDeviationBps?: number | undefined;
  quote: TokenizedStockQuote;
  now: Date;
}

interface EvaluationOutput {
  verdict: TokenizedStockVerdict;
  actionability: TokenizedStockActionability;
  reasons: string[];
  advisories: string[];
  reference: {
    navPrice: number | null;
    navPriceUpdatedAt: string | null;
    navAgeSeconds: number | null;
    navAgeHours: number | null;
    multiplier: number;
    referenceTokenPriceUsd: number | null;
    pausedFeatures: string[];
    marketStatus: MarketStatus;
    settlementSensitiveAction: boolean;
    decisionPriceUsd?: number | undefined;
    deviationBps?: number | undefined;
    maxDeviationBps?: number | undefined;
  };
}

export function evaluateTokenizedStockRequest(input: EvaluationInput): EvaluationOutput {
  const { action, quote, now } = input;
  const maxDeviationBps = input.maxDeviationBps ?? DEFAULT_MAX_DEVIATION_BPS;
  const settlementSensitive = SETTLEMENT_SENSITIVE_ACTIONS.has(action);
  const reasons: string[] = [];
  const advisories: string[] = [];

  if (quote.navPrice === null) {
    return {
      verdict: 'NOT_PRICEABLE',
      actionability: 'NO_PRICE',
      reasons: ['NAV_ABSENT'],
      advisories,
      reference: {
        navPrice: null,
        navPriceUpdatedAt: quote.navPriceUpdatedAt,
        navAgeSeconds: null,
        navAgeHours: null,
        multiplier: quote.multiplier ?? 1,
        referenceTokenPriceUsd: null,
        pausedFeatures: quote.pausedFeatures,
        marketStatus: marketStatus(now),
        settlementSensitiveAction: settlementSensitive,
      },
    };
  }

  const status = marketStatus(now);
  const marketOpen = status.open;
  const marketClosed = !status.open;
  const tokenPrice = canonicalTokenPrice(quote);
  let ageSeconds: number | null = null;
  if (!quote.navPriceUpdatedAt) {
    reasons.push('NAV_TIMESTAMP_ABSENT');
  } else {
    const updated = new Date(quote.navPriceUpdatedAt);
    if (Number.isNaN(updated.getTime())) {
      reasons.push('NAV_TIMESTAMP_UNPARSEABLE');
    } else {
      ageSeconds = Math.floor((now.getTime() - updated.getTime()) / 1000);
      if (ageSeconds < 0) reasons.push('NAV_TIMESTAMP_IN_FUTURE');
    }
  }
  // The 24h heartbeat is a market-hours guarantee. Off-hours holding is the
  // documented design, so age alone is not a violation; staleness only
  // disqualifies when the market is open (the feed should have updated) or
  // when the held value predates the most recent close.
  const ageExceeds = ageSeconds !== null && ageSeconds > NAV_HEARTBEAT_SECONDS;
  if (quote.pausedFeatures.length > 0) {
    reasons.push('PAUSED_FEATURES_PRESENT');
  }

  // Price-consistency check: token unit price = NAV x multiplier.
  let deviationBps: number | undefined;
  if (typeof input.decisionPriceUsd === 'number') {
    if (tokenPrice === null) {
      reasons.push('REFERENCE_PRICE_NON_POSITIVE');
    } else {
      const devBps = Math.round(
        (Math.abs(input.decisionPriceUsd - tokenPrice) / tokenPrice) * 10_000
      );
      deviationBps = devBps;
      if (devBps > maxDeviationBps) {
        reasons.push('PRICE_DEVIATION_EXCEEDS_TOLERANCE');
      }
      if (
        quote.multiplier !== null &&
        Math.abs(quote.multiplier - 1) > 1e-12 &&
        devBps > maxDeviationBps
      ) {
        // Common failure: caller compared against the raw NAV without applying
        // the total-return multiplier.
        const nav = quote.navPrice;
        const devUnadjusted = Math.round((Math.abs(input.decisionPriceUsd - nav) / nav) * 10_000);
        if (devUnadjusted <= maxDeviationBps) {
          advisories.push('DECISION_PRICE_MATCHES_UNADJUSTED_NAV_MULTIPLIER_NOT_APPLIED');
        }
      }
    }
  }

  if (reasons.length === 0) {
    if (marketOpen) {
      if (ageExceeds) reasons.push('NAV_STALE_DURING_MARKET_HOURS');
    } else {
      const lastClose = lastMarketClose(now);
      const updatedMs = quote.navPriceUpdatedAt
        ? new Date(quote.navPriceUpdatedAt).getTime()
        : null;
      const olderThanLastClose =
        lastClose !== null && updatedMs !== null && updatedMs < lastClose - 60_000;
      if (olderThanLastClose) {
        reasons.push('NAV_OLDER_THAN_LAST_CLOSE');
      } else if (settlementSensitive) {
        reasons.push('NAV_FROZEN_SETTLEMENT_FORBIDDEN');
      } else {
        reasons.push('NAV_FROZEN_OFF_HOURS_TRADE_ONLY');
      }
    }
  }

  let verdict: TokenizedStockVerdict;
  let actionability: TokenizedStockActionability;
  if (reasons.length > 0) {
    verdict = reasons.some((r) => r !== 'NAV_FROZEN_OFF_HOURS_TRADE_ONLY') ? 'BLOCK' : 'WAIT';
    actionability = verdict === 'WAIT' ? 'TRADE_ONLY' : 'DO_NOT_USE';
  } else {
    verdict = 'ALLOW';
    actionability = 'SETTLEMENT_SAFE';
  }

  if (quote.multiplier !== null && Math.abs(quote.multiplier - 1) > 1e-12) {
    advisories.push('MULTIPLIER_TOTAL_RETURN_ADJUSTED');
  }
  if (verdict !== 'BLOCK' && marketClosed) {
    advisories.push('OFF_HOURS_FEED_HOLDING_LAST_VALUE');
  }

  return {
    verdict,
    actionability,
    reasons,
    advisories,
    reference: {
      navPrice: quote.navPrice,
      navPriceUpdatedAt: quote.navPriceUpdatedAt,
      navAgeSeconds: ageSeconds,
      navAgeHours: ageSeconds === null ? null : Number((ageSeconds / 3600).toFixed(2)),
      multiplier: quote.multiplier ?? 1,
      referenceTokenPriceUsd: tokenPrice,
      pausedFeatures: quote.pausedFeatures,
      marketStatus: status,
      settlementSensitiveAction: settlementSensitive,
      ...(typeof input.decisionPriceUsd === 'number'
        ? { decisionPriceUsd: input.decisionPriceUsd }
        : {}),
      ...(deviationBps !== undefined ? { deviationBps } : {}),
      maxDeviationBps,
    },
  };
}

function limitations(): string[] {
  return [
    'single-source: the verdict derives from one official issuer reference (Coinbase tokenized-stocks NAV); an independent-provider quorum is required before treating ALLOW as settlement-grade',
    'market session is inferred from Insight local UTC session windows plus a hard-coded 2026 NYSE holiday set; this guard does not consume a signed Headless Oracle /v5/status?mic=XNYS receipt, and holidays, unscheduled halts, or session boundaries may be misclassified',
    'nav_price is an issuer NAV reference, not a live bid/ask or execution price',
    'this guard never signs, submits, or authorizes a transaction',
  ];
}

export interface TokenizedStockGuardResult {
  schema: typeof TOKENIZED_STOCK_GUARD_SCHEMA;
  verdict: TokenizedStockVerdict;
  actionability: TokenizedStockActionability;
  asset: string;
  chainId: typeof TOKENIZED_STOCK_GUARD_CHAIN_ID;
  action: TokenizedStockAction;
  tradeAmountUsd: number;
  evaluatedAt: string;
  reasons: string[];
  advisories: string[];
  limitations: string[];
  reference: EvaluationOutput['reference'];
  dataSource: {
    provider: 'coinbase-tokenized-stocks-api';
    status: 'live' | 'unavailable';
    symbol: string | null;
    contractAddress: string | null;
  };
}

export interface AssessTokenizedStockGuardOptions {
  now?: Date;
  client?: TokenizedStocksClient;
}

/**
 * Fetch the issuer quote and evaluate the request. Any upstream failure is
 * fail-closed: it becomes a BLOCK verdict with REFERENCE_SOURCE_UNAVAILABLE,
 * never an ALLOW.
 */
export async function assessTokenizedStockGuard(
  input: TokenizedStockGuardInput,
  options: AssessTokenizedStockGuardOptions = {}
): Promise<TokenizedStockGuardResult> {
  const now = options.now ?? new Date();
  const client = options.client ?? defaultTokenizedStocksClient();

  const base = {
    schema: TOKENIZED_STOCK_GUARD_SCHEMA,
    asset: input.asset,
    chainId: TOKENIZED_STOCK_GUARD_CHAIN_ID,
    action: input.action,
    tradeAmountUsd: input.tradeAmountUsd,
    evaluatedAt: now.toISOString(),
    limitations: limitations(),
  };

  let quote: TokenizedStockQuote | null;
  try {
    quote = await client.getQuote(input.asset);
  } catch {
    return {
      ...base,
      verdict: 'BLOCK',
      actionability: 'DO_NOT_USE',
      reasons: ['REFERENCE_SOURCE_UNAVAILABLE'],
      advisories: [],
      reference: {
        navPrice: null,
        navPriceUpdatedAt: null,
        navAgeSeconds: null,
        navAgeHours: null,
        multiplier: 1,
        referenceTokenPriceUsd: null,
        pausedFeatures: [],
        marketStatus: marketStatus(now),
        settlementSensitiveAction: input.action === 'borrow' || input.action === 'liquidate',
        maxDeviationBps: input.maxDeviationBps ?? DEFAULT_MAX_DEVIATION_BPS,
      },
      dataSource: {
        provider: 'coinbase-tokenized-stocks-api',
        status: 'unavailable',
        symbol: null,
        contractAddress: null,
      },
    };
  }

  if (!quote) {
    return {
      ...base,
      verdict: 'NOT_PRICEABLE',
      actionability: 'NO_PRICE',
      reasons: ['TOKEN_NOT_IN_ISSUER_DIRECTORY'],
      advisories: [],
      reference: {
        navPrice: null,
        navPriceUpdatedAt: null,
        navAgeSeconds: null,
        navAgeHours: null,
        multiplier: 1,
        referenceTokenPriceUsd: null,
        pausedFeatures: [],
        marketStatus: marketStatus(now),
        settlementSensitiveAction: input.action === 'borrow' || input.action === 'liquidate',
        maxDeviationBps: input.maxDeviationBps ?? DEFAULT_MAX_DEVIATION_BPS,
      },
      dataSource: {
        provider: 'coinbase-tokenized-stocks-api',
        status: 'live',
        symbol: null,
        contractAddress: null,
      },
    };
  }

  const evaluation = evaluateTokenizedStockRequest({ ...input, quote, now });
  return {
    ...base,
    verdict: evaluation.verdict,
    actionability: evaluation.actionability,
    reasons: evaluation.reasons,
    advisories: evaluation.advisories,
    reference: evaluation.reference,
    dataSource: {
      provider: 'coinbase-tokenized-stocks-api',
      status: 'live',
      symbol: quote.symbol,
      contractAddress: quote.contractAddress,
    },
  };
}
