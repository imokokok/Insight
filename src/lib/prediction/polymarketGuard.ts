/**
 * Polymarket prediction-market pre-trade guard (read-only, v1).
 *
 * Scope honesty first: a prediction market's outcome is NOT an oracle
 * consensus question. Insight's cross-oracle pre-trade machinery
 * (`preTradeSafetyCheck`) is deliberately NOT applied here — pretending it
 * applies would fabricate price-fairness evidence for an arbitrary-event
 * claim. What this guard CAN verify, from the venue's own machine-readable
 * metadata (live-verified against gamma-api.polymarket.com on 2026-11-04):
 *
 *   1. Lifecycle — the market is active, not closed, and its resolution
 *      window is still open with enough remaining time that an entry is not
 *      a pure adverse-selection donation.
 *   2. Window integrity — the `*-updown-*` slug parses and its encoded
 *      window agrees with `endDate` (the same cross-check the settlement
 *      evidence collector applies before trusting a window).
 *   3. Quote integrity — the venue's quoted binary probability parses and
 *      sums to ~1; the caller's chosen side has a quoted, non-extreme price.
 *   4. Settlement verifiability — the declared resolution source maps onto a
 *      venue the settlement-evidence pipeline can verify post-hoc
 *      (chainlink-stream / binance). An `unknown` venue means Insight will
 *      never be able to produce settlement evidence for this market.
 *
 * Reviewed profile thresholds were reviewed on 2026-11-04 against the live
 * 5-minute updown series (54 open contracts sampled): fresh contracts
 * legitimately publish `outcomePrices: null`, zero liquidity and a 1.0
 * spread before their window opens, so thin-but-forming books are disclosed
 * rather than penalized; an unquoted book is a CAUTION, not a BLOCK.
 *
 * Fail-closed: any transport or shape failure BLOCKs — the market metadata
 * is the only assessment input, so without it there is no verdict.
 */

import { z } from 'zod';

import {
  classifySettlementVenue,
  DEFAULT_GAMMA_BASE_URL,
  parseUpdownSlug,
  type GammaMarket,
} from '@/lib/settlementEvidence/polymarket';

export const POLYMARKET_GUARD_PROTOCOL_ID = 'polymarket-prediction-mainnet';
export const POLYMARKET_GUARD_SCHEMA_VERSION = 'insight.polymarket-guard.v1';

/** Live-verified Gamma base URL for the default fetcher. */
export const POLYMARKET_GUARD_GAMMA_BASE_URL = DEFAULT_GAMMA_BASE_URL;

export type PolymarketGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

export const PolymarketGuardInputSchema = z.object({
  protocolId: z.literal(POLYMARKET_GUARD_PROTOCOL_ID),
  action: z.enum(['buy_up', 'buy_down']),
  marketSlug: z.string().trim().min(1).max(200),
});
export type PolymarketGuardInput = z.infer<typeof PolymarketGuardInputSchema>;

/** Reviewed timing thresholds (seconds / fractions of the market window). */
const IMMINENT_RESOLUTION_MIN_SECONDS = 30;
const IMMINENT_RESOLUTION_WINDOW_FRACTION = 0.05;
const LATE_WINDOW_FRACTION = 0.2;
const PROBABILITY_SUM_TOLERANCE = 0.05;
const EXTREME_PROBABILITY = 0.95;
/** Same endDate/slug-window tolerance the settlement collector applies. */
const END_DATE_TOLERANCE_MS = 120_000;

export interface PolymarketGuardMarketEvidence {
  marketSlug: string;
  gammaId: string | null;
  question: string | null;
  asset: string | null;
  windowSeconds: number | null;
  windowStartMs: number | null;
  windowEndMs: number | null;
  settlementVenue: 'chainlink-stream' | 'binance' | 'unknown';
  resolutionSourceUrl: string | null;
  closed: boolean | null;
  active: boolean | null;
  endDateRaw: string | null;
  endDateMatchesSlugWindow: boolean | null;
}

export interface PolymarketGuardQuoteEvidence {
  /** Venue-quoted probability for the "Up" outcome, 0..1, or null. */
  upProbability: number | null;
  downProbability: number | null;
  /** Quoted price of the side the caller intends to buy, or null. */
  chosenSidePrice: number | null;
  /** Venue-reported order-book and volume aggregates (disclosed only). */
  liquidityNum: number | null;
  volumeNum: number | null;
  spread: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  lastTradePrice: number | null;
}

export interface PolymarketGuardTimingEvidence {
  evaluatedAtMs: number;
  secondsToResolution: number | null;
  windowProgressPct: number | null;
}

export interface PolymarketGuardCheck {
  id: string;
  status: 'pass' | 'caution' | 'block';
  detail: string;
}

export interface PolymarketGuardResult {
  schema: typeof POLYMARKET_GUARD_SCHEMA_VERSION;
  verdict: PolymarketGuardVerdict;
  protocolId: typeof POLYMARKET_GUARD_PROTOCOL_ID;
  action: PolymarketGuardInput['action'];
  evaluatedAt: string;
  scope: {
    venue: 'polymarket';
    network: 'polymarket-mainnet';
    transactionAuthority: 'none';
    valuation: 'venue_quoted_probability';
  };
  market: PolymarketGuardMarketEvidence;
  quotes: PolymarketGuardQuoteEvidence;
  timing: PolymarketGuardTimingEvidence;
  checks: PolymarketGuardCheck[];
  reasons: string[];
  disclosure: {
    /** Cross-oracle consensus is intentionally not applied to event markets. */
    oracleConsensus: 'not_applicable_to_event_markets';
    /** Book depth is disclosed from venue-reported aggregates; no reviewed floor in v1. */
    liquidityAssessment: 'venue_reported_aggregates_no_reviewed_floor';
    /** What the settlement-evidence pipeline can and cannot verify post-hoc. */
    settlementEvidence: string;
  };
  next: {
    execution: 'not_performed';
    priorSeal: string;
  };
}

export interface PolymarketGuardDependencies {
  /** Injectable single-market fetcher. Must throw on transport failure. */
  fetchMarket?: (marketSlug: string) => Promise<GammaMarket | null>;
  now?: () => Date;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseProbabilityList(raw: string | null | undefined): {
  up: number | null;
  down: number | null;
  wellFormed: boolean;
} {
  if (!raw) return { up: null, down: null, wellFormed: false };
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return { up: null, down: null, wellFormed: false };
  }
  if (!Array.isArray(list) || list.length !== 2) {
    return { up: null, down: null, wellFormed: false };
  }
  const up = Number(list[0]);
  const down = Number(list[1]);
  if (!Number.isFinite(up) || !Number.isFinite(down)) {
    return { up: null, down: null, wellFormed: false };
  }
  return { up, down, wellFormed: true };
}

function finiteNumberOrNull(value: unknown): number | null {
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Default fetcher: Gamma single-market lookup by slug (live-verified to
 *  return a JSON array; an empty array means the slug does not resolve). */
async function defaultFetchMarket(marketSlug: string): Promise<GammaMarket | null> {
  const url = `${POLYMARKET_GUARD_GAMMA_BASE_URL}/markets?slug=${encodeURIComponent(marketSlug)}`;
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`Gamma API ${response.status} for slug lookup`);
  }
  const body: unknown = await response.json();
  if (!Array.isArray(body)) {
    throw new Error('Gamma slug lookup returned a non-array payload');
  }
  const first = body[0];
  if (first === undefined) return null;
  if (first === null || typeof first !== 'object' || Array.isArray(first)) {
    throw new Error('Gamma slug lookup returned a malformed market payload');
  }
  const record = first as Record<string, unknown>;
  const market: GammaMarket & Record<string, unknown> = {
    id: String(record.id ?? ''),
    question: typeof record.question === 'string' ? record.question : '',
    slug: typeof record.slug === 'string' ? record.slug : marketSlug,
    description: typeof record.description === 'string' ? record.description : null,
    resolutionSource: typeof record.resolutionSource === 'string' ? record.resolutionSource : null,
    endDate: typeof record.endDate === 'string' ? record.endDate : null,
    closed: typeof record.closed === 'boolean' ? record.closed : null,
    active: typeof record.active === 'boolean' ? record.active : null,
    outcomes: typeof record.outcomes === 'string' ? record.outcomes : null,
    outcomePrices: typeof record.outcomePrices === 'string' ? record.outcomePrices : null,
    // Disclosed aggregates (live-verified field names, 2026-11-04).
    liquidityNum: finiteNumberOrNull(record.liquidityNum),
    volumeNum: finiteNumberOrNull(record.volumeNum),
    spread: finiteNumberOrNull(record.spread),
    bestBid: finiteNumberOrNull(record.bestBid),
    bestAsk: finiteNumberOrNull(record.bestAsk),
    lastTradePrice: finiteNumberOrNull(record.lastTradePrice),
  };
  return market;
}

/**
 * Assess one Polymarket market for a pre-trade entry. Read-only: no order,
 * no approval, no on-chain authority is evaluated or granted. Fails closed
 * on any fetch or shape failure.
 */
export async function assessPolymarketGuard(
  rawInput: PolymarketGuardInput,
  dependencies: PolymarketGuardDependencies = {}
): Promise<PolymarketGuardResult> {
  const input = PolymarketGuardInputSchema.parse(rawInput);
  const nowMs = (dependencies.now ?? (() => new Date()))().getTime();
  const fetchMarket = dependencies.fetchMarket ?? defaultFetchMarket;

  const checks: PolymarketGuardCheck[] = [];
  const reasons: string[] = [];
  let verdict: PolymarketGuardVerdict = 'ALLOW';

  const escalate = (status: 'caution' | 'block') => {
    if (status === 'block') verdict = 'BLOCK';
    else if (verdict !== 'BLOCK') verdict = 'CAUTION';
  };

  // --- Fetch (fail closed) -------------------------------------------------
  let market: GammaMarket | null = null;
  let fetchFailureReason: string | null = null;
  try {
    market = await fetchMarket(input.marketSlug);
  } catch (error) {
    fetchFailureReason = error instanceof Error ? error.message : String(error);
  }

  if (market === null) {
    escalate('block');
    const detail =
      fetchFailureReason !== null
        ? `Gamma metadata unavailable (fail closed): ${fetchFailureReason}`
        : 'Gamma slug lookup resolved no market (fail closed)';
    checks.push({ id: 'market-fetch', status: 'block', detail });
    reasons.push('assessment input unavailable');
    return buildResult(input, nowMs, {
      market: emptyMarketEvidence(input.marketSlug),
      quotes: emptyQuoteEvidence(),
      checks,
      reasons,
      verdict,
      windowSeconds: null,
      windowStartMs: null,
      windowEndMs: null,
    });
  }
  checks.push({ id: 'market-fetch', status: 'pass', detail: 'Gamma metadata retrieved' });

  // --- Reviewed scope: machine-parseable price contracts only -------------
  const parsed = parseUpdownSlug(market.slug);
  if (!parsed) {
    escalate('block');
    checks.push({
      id: 'reviewed-scope',
      status: 'block',
      detail: `slug "${market.slug}" is not a machine-parseable updown price contract`,
    });
    reasons.push('outside reviewed market scope');
    return buildResult(input, nowMs, {
      market: emptyMarketEvidence(input.marketSlug),
      quotes: emptyQuoteEvidence(),
      checks,
      reasons,
      verdict,
      windowSeconds: null,
      windowStartMs: null,
      windowEndMs: null,
    });
  }
  checks.push({
    id: 'reviewed-scope',
    status: 'pass',
    detail: `${parsed.asset} ${parsed.windowSeconds / 60}m window starting ${new Date(
      parsed.windowStartMs
    ).toISOString()}`,
  });

  // --- Window integrity: endDate must agree with the slug window ----------
  const windowEndMs = parsed.windowStartMs + parsed.windowSeconds * 1000;
  const endDateMs = market.endDate ? Date.parse(market.endDate) : NaN;
  const endDateMatches =
    Number.isFinite(endDateMs) && Math.abs(endDateMs - windowEndMs) < END_DATE_TOLERANCE_MS;
  if (!endDateMatches) {
    escalate('caution');
    checks.push({
      id: 'window-integrity',
      status: 'caution',
      detail: market.endDate
        ? `endDate ${market.endDate} disagrees with slug window end ${new Date(
            windowEndMs
          ).toISOString()}`
        : 'endDate missing from market metadata',
    });
    reasons.push('market window metadata inconsistent');
  } else {
    checks.push({
      id: 'window-integrity',
      status: 'pass',
      detail: 'endDate agrees with slug window',
    });
  }

  // --- Lifecycle: active / not closed --------------------------------------
  if (market.closed === true) {
    escalate('block');
    checks.push({ id: 'lifecycle', status: 'block', detail: 'market is closed' });
    reasons.push('market closed');
  } else if (market.active === false) {
    escalate('block');
    checks.push({ id: 'lifecycle', status: 'block', detail: 'market is not active' });
    reasons.push('market not active');
  } else {
    checks.push({
      id: 'lifecycle',
      status: 'pass',
      detail: `closed=${String(market.closed ?? 'unknown')} active=${String(
        market.active ?? 'unknown'
      )}`,
    });
  }

  // --- Timing: resolution window must be open with margin ------------------
  const secondsToResolution = Number.isFinite(endDateMs)
    ? Math.round((endDateMs - nowMs) / 1000)
    : null;
  if (secondsToResolution !== null) {
    const imminentSeconds = Math.max(
      IMMINENT_RESOLUTION_MIN_SECONDS,
      parsed.windowSeconds * IMMINENT_RESOLUTION_WINDOW_FRACTION
    );
    if (secondsToResolution <= 0) {
      escalate('block');
      checks.push({
        id: 'resolution-timing',
        status: 'block',
        detail: 'resolution window has already ended',
      });
      reasons.push('resolution window ended');
    } else if (secondsToResolution < imminentSeconds) {
      escalate('block');
      checks.push({
        id: 'resolution-timing',
        status: 'block',
        detail: `only ${secondsToResolution}s to resolution (reviewed minimum ${Math.round(
          imminentSeconds
        )}s)`,
      });
      reasons.push('imminent resolution, adverse-selection entry');
    } else if (secondsToResolution < parsed.windowSeconds * LATE_WINDOW_FRACTION) {
      escalate('caution');
      checks.push({
        id: 'resolution-timing',
        status: 'caution',
        detail: `late-window entry: ${secondsToResolution}s of ${parsed.windowSeconds}s remain`,
      });
      reasons.push('late-window entry');
    } else {
      checks.push({
        id: 'resolution-timing',
        status: 'pass',
        detail: `${secondsToResolution}s to resolution`,
      });
    }
  } else {
    escalate('caution');
    checks.push({
      id: 'resolution-timing',
      status: 'caution',
      detail: 'resolution timing cannot be derived (no parsable endDate)',
    });
    reasons.push('resolution timing unknown');
  }

  // --- Quote integrity + chosen-side pricing -------------------------------
  const probabilities = parseProbabilityList(market.outcomePrices);
  const quotes: PolymarketGuardQuoteEvidence = {
    upProbability: probabilities.up,
    downProbability: probabilities.down,
    chosenSidePrice: input.action === 'buy_up' ? probabilities.up : probabilities.down,
    liquidityNum: finiteNumberOrNull(
      (market as GammaMarket & { liquidityNum?: unknown }).liquidityNum
    ),
    volumeNum: finiteNumberOrNull((market as GammaMarket & { volumeNum?: unknown }).volumeNum),
    spread: finiteNumberOrNull((market as GammaMarket & { spread?: unknown }).spread),
    bestBid: finiteNumberOrNull((market as GammaMarket & { bestBid?: unknown }).bestBid),
    bestAsk: finiteNumberOrNull((market as GammaMarket & { bestAsk?: unknown }).bestAsk),
    lastTradePrice: finiteNumberOrNull(
      (market as GammaMarket & { lastTradePrice?: unknown }).lastTradePrice
    ),
  };

  if (probabilities.wellFormed && probabilities.up !== null && probabilities.down !== null) {
    const sumDeviation = Math.abs(probabilities.up + probabilities.down - 1);
    if (sumDeviation > PROBABILITY_SUM_TOLERANCE) {
      escalate('caution');
      checks.push({
        id: 'quote-integrity',
        status: 'caution',
        detail: `quoted probabilities sum to ${roundTo(probabilities.up + probabilities.down, 4)}`,
      });
      reasons.push('venue quote fails binary-consistency check');
    } else {
      checks.push({
        id: 'quote-integrity',
        status: 'pass',
        detail: `Up=${roundTo(probabilities.up, 4)} Down=${roundTo(probabilities.down, 4)}`,
      });
    }
    const chosen = input.action === 'buy_up' ? probabilities.up : probabilities.down;
    if (chosen !== null && chosen >= EXTREME_PROBABILITY) {
      escalate('caution');
      checks.push({
        id: 'chosen-side-price',
        status: 'caution',
        detail: `chosen side quoted at ${roundTo(chosen, 4)} — near-certain pricing, fee-dominated payoff`,
      });
      reasons.push('chosen side priced near certainty');
    } else if (chosen !== null && chosen <= 1 - EXTREME_PROBABILITY) {
      escalate('caution');
      checks.push({
        id: 'chosen-side-price',
        status: 'caution',
        detail: `chosen side quoted at ${roundTo(chosen, 4)} — deep out-of-the-money lottery pricing`,
      });
      reasons.push('chosen side priced as long shot');
    } else {
      checks.push({
        id: 'chosen-side-price',
        status: 'pass',
        detail:
          chosen !== null
            ? `chosen side quoted at ${roundTo(chosen, 4)}`
            : 'side price unavailable',
      });
    }
  } else if (market.outcomePrices == null) {
    // Fresh 5m contracts legitimately publish null before their window opens.
    escalate('caution');
    checks.push({
      id: 'quote-integrity',
      status: 'caution',
      detail: 'book not yet quoted (outcomePrices null)',
    });
    reasons.push('venue probability not yet quoted');
  } else {
    escalate('caution');
    checks.push({
      id: 'quote-integrity',
      status: 'caution',
      detail: 'outcomePrices malformed; quoted probability unusable',
    });
    reasons.push('venue probability unusable');
  }

  // --- Settlement verifiability --------------------------------------------
  const venue = classifySettlementVenue(market.description, market.resolutionSource);
  if (venue === 'unknown') {
    escalate('caution');
    checks.push({
      id: 'settlement-verifiability',
      status: 'caution',
      detail: 'declared settlement venue not recognizable; post-hoc evidence impossible',
    });
    reasons.push('settlement venue unverifiable');
  } else {
    checks.push({
      id: 'settlement-verifiability',
      status: 'pass',
      detail: `settlement venue: ${venue}`,
    });
  }

  const marketEvidence: PolymarketGuardMarketEvidence = {
    marketSlug: market.slug || input.marketSlug,
    gammaId: market.id ? String(market.id) : null,
    question: market.question || null,
    asset: parsed.asset,
    windowSeconds: parsed.windowSeconds,
    windowStartMs: parsed.windowStartMs,
    windowEndMs,
    settlementVenue: venue,
    resolutionSourceUrl: market.resolutionSource?.trim() || null,
    closed: market.closed ?? null,
    active: market.active ?? null,
    endDateRaw: market.endDate ?? null,
    endDateMatchesSlugWindow: endDateMatches,
  };

  return buildResult(input, nowMs, {
    market: marketEvidence,
    quotes,
    checks,
    reasons,
    verdict,
    windowSeconds: parsed.windowSeconds,
    windowStartMs: parsed.windowStartMs,
    windowEndMs,
  });
}

function emptyMarketEvidence(marketSlug: string): PolymarketGuardMarketEvidence {
  return {
    marketSlug,
    gammaId: null,
    question: null,
    asset: null,
    windowSeconds: null,
    windowStartMs: null,
    windowEndMs: null,
    settlementVenue: 'unknown',
    resolutionSourceUrl: null,
    closed: null,
    active: null,
    endDateRaw: null,
    endDateMatchesSlugWindow: null,
  };
}

function emptyQuoteEvidence(): PolymarketGuardQuoteEvidence {
  return {
    upProbability: null,
    downProbability: null,
    chosenSidePrice: null,
    liquidityNum: null,
    volumeNum: null,
    spread: null,
    bestBid: null,
    bestAsk: null,
    lastTradePrice: null,
  };
}

function buildResult(
  input: PolymarketGuardInput,
  nowMs: number,
  parts: {
    market: PolymarketGuardMarketEvidence;
    quotes: PolymarketGuardQuoteEvidence;
    checks: PolymarketGuardCheck[];
    reasons: string[];
    verdict: PolymarketGuardVerdict;
    windowSeconds: number | null;
    windowStartMs: number | null;
    windowEndMs: number | null;
  }
): PolymarketGuardResult {
  const endDateMs = parts.windowEndMs;
  const secondsToResolution = endDateMs !== null ? Math.round((endDateMs - nowMs) / 1000) : null;
  const windowProgressPct =
    parts.windowSeconds !== null &&
    parts.windowSeconds > 0 &&
    parts.windowStartMs !== null &&
    secondsToResolution !== null
      ? roundTo(
          Math.min(
            100,
            Math.max(0, ((nowMs - parts.windowStartMs) / (parts.windowSeconds * 1000)) * 100)
          ),
          2
        )
      : null;

  return {
    schema: POLYMARKET_GUARD_SCHEMA_VERSION,
    verdict: parts.verdict,
    protocolId: POLYMARKET_GUARD_PROTOCOL_ID,
    action: input.action,
    evaluatedAt: new Date(nowMs).toISOString(),
    scope: {
      venue: 'polymarket',
      network: 'polymarket-mainnet',
      transactionAuthority: 'none',
      valuation: 'venue_quoted_probability',
    },
    market: parts.market,
    quotes: parts.quotes,
    timing: {
      evaluatedAtMs: nowMs,
      secondsToResolution,
      windowProgressPct,
    },
    checks: parts.checks,
    reasons: parts.reasons,
    disclosure: {
      oracleConsensus: 'not_applicable_to_event_markets',
      liquidityAssessment: 'venue_reported_aggregates_no_reviewed_floor',
      settlementEvidence:
        'Only chainlink-stream and binance settlement venues can be verified by the ' +
        'post-hoc settlement-evidence pipeline; an unknown venue means no verifiable ' +
        'settlement evidence will ever exist for this market.',
    },
    next: {
      execution: 'not_performed',
      priorSeal:
        'This assessment screens market metadata and lifecycle only; it is not a price-fairness ' +
        'or outcome verdict, and no execution authority is evaluated or granted.',
    },
  };
}
