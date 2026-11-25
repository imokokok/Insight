import { keccak256, toBytes } from 'viem';
import { z } from 'zod';

const GAMMA = 'https://gamma-api.polymarket.com';
const CLOB = 'https://clob.polymarket.com';

export const PolymarketDiscoveryInputSchema = z
  .object({
    query: z.string().trim().max(120).optional(),
    tagId: z
      .string()
      .trim()
      .regex(/^\d{1,20}$/)
      .optional(),
    afterCursor: z.string().trim().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((value) => !(value.query && value.tagId), {
    message: 'query and tagId are separate discovery modes',
  })
  .refine((value) => !(value.query && value.afterCursor), {
    message: 'afterCursor is available for tag/category feeds, not free-text search',
  });
export type PolymarketDiscoveryInput = z.infer<typeof PolymarketDiscoveryInputSchema>;

export const PolymarketAssessmentInputSchema = z.object({
  marketId: z.string().trim().min(1).max(100),
  outcome: z.string().trim().min(1).max(100),
});
export type PolymarketAssessmentInput = z.infer<typeof PolymarketAssessmentInputSchema>;

export type NormalizedPolymarketMarket = {
  id: string;
  rulesDigest: `0x${string}`;
  conditionId: string | null;
  protocolVersion: 'v1' | 'v2' | null;
  slug: string;
  question: string;
  description: string;
  resolutionSource: string | null;
  endDate: string | null;
  active: boolean | null;
  closed: boolean | null;
  outcomes: Array<{ name: string; assetId: string | null; probability: number | null }>;
  liquidity: number | null;
  volume: number | null;
};

type MarketRuleFields = Pick<
  NormalizedPolymarketMarket,
  'id' | 'question' | 'description' | 'resolutionSource' | 'endDate' | 'outcomes'
>;

/** Stable digest of the rule-bearing venue fields reviewed by a macro binding. */
export function polymarketMarketRulesDigest(market: MarketRuleFields): `0x${string}` {
  return keccak256(
    toBytes(
      JSON.stringify([
        market.id,
        market.question,
        market.description,
        market.resolutionSource,
        market.endDate,
        market.outcomes.map((outcome) => outcome.name),
      ])
    )
  );
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function jsonArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function finite(value: unknown): number | null {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;
  return Number.isFinite(number) ? number : null;
}
function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}
function boundedText(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.length <= maxLength ? value : null;
}
function assetId(value: unknown): string | null {
  return typeof value === 'string' && /^[1-9]\d{0,77}$/.test(value) ? value : null;
}
function nonNegative(value: unknown): number | null {
  const parsed = finite(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}
function isHttpsUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}
function conditionId(value: unknown): string | null {
  return typeof value === 'string' && /^0x[\da-f]{64}$/i.test(value) ? value.toLowerCase() : null;
}
function probability(value: unknown): number | null {
  const parsed = finite(value);
  return parsed !== null && parsed >= 0 && parsed <= 1 ? parsed : null;
}

/** Normalize Gamma V1 token IDs and V2 position IDs to the same outcome model. */
export function normalizePolymarketMarket(value: unknown): NormalizedPolymarketMarket | null {
  const raw = record(value);
  if (
    !raw ||
    (typeof raw.id !== 'string' && typeof raw.id !== 'number') ||
    (typeof raw.id === 'number' && !Number.isSafeInteger(raw.id)) ||
    String(raw.id).length < 1 ||
    String(raw.id).length > 100
  )
    return null;
  const rawOutcomes = jsonArray(raw.outcomes);
  const assetIds = jsonArray(raw.clobTokenIds) ?? jsonArray(raw.positionIds);
  const prices = jsonArray(raw.outcomePrices);
  let outcomeNames: string[];
  const embeddedAssetIds: Array<string | null> = [];
  if (rawOutcomes) {
    if (
      rawOutcomes.length < 2 ||
      rawOutcomes.length > 100 ||
      rawOutcomes.some((item) => typeof item !== 'string' || !item.trim())
    )
      return null;
    outcomeNames = rawOutcomes as string[];
    if (outcomeNames.some((name) => name.length > 100)) return null;
  } else {
    // Newer typed event responses model Yes/No outcomes as objects instead of
    // Gamma's legacy JSON-encoded string arrays.
    const structured = record(raw.outcomes);
    if (!structured) return null;
    const entries = Object.entries(structured);
    if (entries.length < 2 || entries.length > 100 || entries.some(([name]) => name.length > 100))
      return null;
    outcomeNames = [];
    for (const [name, value] of entries) {
      const item = record(value);
      if (!item) return null;
      outcomeNames.push(name);
      const token = typeof item.tokenId === 'string' ? item.tokenId : null;
      const position = typeof item.positionId === 'string' ? item.positionId : null;
      embeddedAssetIds.push(token ?? position);
    }
  }
  const normalized: Omit<NormalizedPolymarketMarket, 'rulesDigest'> = {
    id: String(raw.id),
    conditionId: conditionId(raw.conditionId ?? raw.condition_id),
    protocolVersion: raw.version === 'v1' || raw.version === 'v2' ? raw.version : null,
    slug: boundedText(raw.slug, 200) ?? '',
    question: boundedText(raw.question, 2000) ?? '',
    description: boundedText(raw.description, 20_000) ?? '',
    resolutionSource: boundedText(raw.resolutionSource, 2048),
    endDate: boundedText(raw.endDate, 100),
    active: bool(raw.active),
    closed: bool(raw.closed),
    outcomes: outcomeNames.map((name, index) => {
      const candidateAssetId = embeddedAssetIds[index] ?? assetIds?.[index];
      return {
        name: name.trim(),
        assetId: assetId(candidateAssetId),
        probability: probability(prices?.[index]),
      };
    }),
    liquidity: nonNegative(raw.liquidityNum ?? raw.liquidity),
    volume: nonNegative(raw.volumeNum ?? raw.volume),
  };
  return { ...normalized, rulesDigest: polymarketMarketRulesDigest(normalized) };
}

async function gamma(path: string, params: URLSearchParams, deadlineAt?: number): Promise<unknown> {
  const timeoutMs = deadlineAt ? Math.min(10_000, deadlineAt - Date.now()) : 10_000;
  if (timeoutMs <= 0) throw new Error('Polymarket discovery exceeded its time budget');
  const response = await fetch(`${GAMMA}${path}?${params}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Polymarket Gamma returned ${response.status}`);
  return boundedJson(response, 1_000_000, 'Gamma');
}

/** Read one complete Gamma market record for an explicitly bound market ID. */
export async function getPolymarketMarketById(
  marketId: string,
  deadlineAt?: number
): Promise<NormalizedPolymarketMarket | null> {
  const detailParams = new URLSearchParams({ id: marketId, closed: 'any', limit: '1' });
  const payload = await gamma('/markets', detailParams, deadlineAt);
  return Array.isArray(payload) ? normalizePolymarketMarket(payload[0]) : null;
}

async function boundedJson(response: Response, maxBytes: number, source: string): Promise<unknown> {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes)
    throw new Error(`Polymarket ${source} response exceeds the size limit`);
  let bytes: Uint8Array;
  if (response.body) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new Error(`Polymarket ${source} response exceeds the size limit`);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
  } else {
    const text = await response.text();
    bytes = new TextEncoder().encode(text);
    if (bytes.byteLength > maxBytes)
      throw new Error(`Polymarket ${source} response exceeds the size limit`);
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new Error(`Polymarket ${source} returned invalid JSON`);
  }
}

/** Public active market discovery, capped to avoid unbounded upstream reads. */
export async function discoverPolymarketMarkets(input: PolymarketDiscoveryInput): Promise<{
  markets: NormalizedPolymarketMarket[];
  source: string;
  nextCursor: string | null;
  fetchedAt: string;
}> {
  // Leave time for auth middleware and response serialization under this
  // route's 20-second platform limit, even when a full page needs enrichment.
  const deadlineAt = Date.now() + 15_000;
  const pageLimit = input.query && !input.tagId ? Math.min(50, input.limit * 4) : input.limit;
  let candidates: Array<Record<string, unknown>>;
  let source = `${GAMMA}/markets/keyset`;
  let nextCursor: string | null = null;
  if (input.query && !input.tagId) {
    const search = record(
      await gamma(
        '/public-search',
        new URLSearchParams({ q: input.query, limit: String(pageLimit) }),
        deadlineAt
      )
    );
    if (!search || !Array.isArray(search.events))
      throw new Error('Polymarket Gamma returned malformed search results');
    const eventRefs = search.events
      .slice(0, pageLimit)
      .map(record)
      .filter(
        (event): event is Record<string, unknown> =>
          event !== null && (typeof event.id === 'string' || typeof event.id === 'number')
      );
    const events = await Promise.all(
      eventRefs.slice(0, pageLimit).map(async (eventRef) => {
        try {
          return record(
            await gamma(
              `/events/${encodeURIComponent(String(eventRef.id))}`,
              new URLSearchParams(),
              deadlineAt
            )
          );
        } catch {
          return null;
        }
      })
    );
    candidates = [];
    for (const event of events) {
      if (!Array.isArray(event?.markets)) continue;
      for (const marketValue of event.markets) {
        const market = record(marketValue);
        if (market && (typeof market.id === 'string' || typeof market.id === 'number'))
          candidates.push(market);
        if (candidates.length >= pageLimit) break;
      }
      if (candidates.length >= pageLimit) break;
    }
    source = `${GAMMA}/public-search + /events/{id}`;
  } else {
    const params = new URLSearchParams({ closed: 'false', limit: String(pageLimit) });
    if (input.tagId) params.set('tag_id', input.tagId);
    if (input.afterCursor) params.set('after_cursor', input.afterCursor);
    const payload = record(await gamma('/markets/keyset', params, deadlineAt));
    if (!payload || !Array.isArray(payload.markets))
      throw new Error('Polymarket Gamma returned a malformed market page');
    candidates = payload.markets
      .map(record)
      .filter(
        (market): market is Record<string, unknown> =>
          market !== null && (typeof market.id === 'string' || typeof market.id === 'number')
      );
    nextCursor =
      typeof payload.next_cursor === 'string' && payload.next_cursor.length <= 2048
        ? payload.next_cursor
        : null;
  }
  // Keyset list entries can omit trading fields. Re-fetch the bounded page by
  // identifier so V1 token IDs and V2 position IDs both come from full market
  // detail records before they are returned as assessable candidates.
  const details: Array<NormalizedPolymarketMarket | null> = [];
  for (let offset = 0; offset < candidates.length; offset += 8) {
    const batch = await Promise.all(
      candidates.slice(offset, offset + 8).map(async (candidate) => {
        try {
          const detailParams = new URLSearchParams({
            id: String(candidate.id),
            closed: 'any',
            limit: '1',
          });
          const detail = await gamma('/markets', detailParams, deadlineAt);
          return Array.isArray(detail) ? normalizePolymarketMarket(detail[0]) : null;
        } catch {
          return null;
        }
      })
    );
    details.push(...batch);
  }
  const markets = details
    .filter(
      (market): market is NormalizedPolymarketMarket => market !== null && market.active !== false
    )
    .slice(0, input.limit);
  return { markets, source, nextCursor, fetchedAt: new Date().toISOString() };
}

type OrderBook = {
  timestamp: number | null;
  hash: string | null;
  bid: { price: number; size: number } | null;
  ask: { price: number; size: number } | null;
};

type AssessmentState = {
  checks: Array<{ id: string; status: 'pass' | 'caution' | 'block'; detail: string }>;
  reasons: string[];
  verdict: 'ALLOW' | 'CAUTION' | 'BLOCK';
  escalate: (status: 'caution' | 'block') => void;
};

function createAssessmentState(): AssessmentState {
  const state: AssessmentState = {
    checks: [],
    reasons: [],
    verdict: 'ALLOW',
    escalate(status) {
      if (status === 'block') state.verdict = 'BLOCK';
      else if (state.verdict === 'ALLOW') state.verdict = 'CAUTION';
    },
  };
  return state;
}

function assessLifecycle(market: NormalizedPolymarketMarket, state: AssessmentState): void {
  if (market.closed === true || market.active === false) {
    state.escalate('block');
    state.checks.push({ id: 'lifecycle', status: 'block', detail: 'Market is closed or inactive' });
    state.reasons.push('market not open');
  } else if (market.closed === null || market.active === null) {
    state.escalate('caution');
    state.checks.push({
      id: 'lifecycle',
      status: 'caution',
      detail: 'Market lifecycle is incomplete in venue metadata',
    });
    state.reasons.push('lifecycle not fully verifiable');
  } else
    state.checks.push({
      id: 'lifecycle',
      status: 'pass',
      detail: 'Market is active and not closed',
    });
}

function assessOutcomes(
  market: NormalizedPolymarketMarket,
  requested: string,
  state: AssessmentState
) {
  if (market.outcomes.length !== 2 || market.outcomes.some((entry) => entry.assetId === null)) {
    state.escalate('block');
    state.checks.push({
      id: 'binary-outcomes',
      status: 'block',
      detail: 'Assessment supports exactly two outcomes with normalized CLOB asset IDs',
    });
    state.reasons.push('unsupported outcome structure');
  } else
    state.checks.push({
      id: 'binary-outcomes',
      status: 'pass',
      detail: 'Two outcomes and their venue asset IDs were identified',
    });
  const chosen = market.outcomes.find(
    (entry) => entry.name.toLowerCase() === requested.toLowerCase()
  );
  if (!chosen || !chosen.assetId) {
    state.escalate('block');
    state.checks.push({
      id: 'selected-outcome',
      status: 'block',
      detail: 'Requested outcome does not match a market outcome',
    });
    state.reasons.push('outcome identity mismatch');
  }
  const prices = market.outcomes.map((entry) => entry.probability);
  if (
    prices.length === 2 &&
    prices.every((price): price is number => price !== null && price >= 0 && price <= 1)
  ) {
    const sum = prices[0] + prices[1];
    if (Math.abs(sum - 1) > 0.05) {
      state.escalate('caution');
      state.checks.push({
        id: 'venue-probability-integrity',
        status: 'caution',
        detail: `Venue outcome probabilities sum to ${sum.toFixed(4)}`,
      });
      state.reasons.push('venue probabilities fail binary consistency');
    } else
      state.checks.push({
        id: 'venue-probability-integrity',
        status: 'pass',
        detail: `Venue outcome probabilities sum to ${sum.toFixed(4)}`,
      });
  } else {
    state.escalate('caution');
    state.checks.push({
      id: 'venue-probability-integrity',
      status: 'caution',
      detail: 'Venue probabilities are missing or malformed',
    });
    state.reasons.push('venue probability unavailable');
  }
  return chosen;
}

function assessRulesAndSource(market: NormalizedPolymarketMarket, state: AssessmentState): void {
  const ruleText = `${market.question} ${market.description}`.trim();
  if (ruleText.length < 24) {
    state.escalate('caution');
    state.checks.push({
      id: 'resolution-rules',
      status: 'caution',
      detail: 'Question or resolution rules are too sparse for automated review',
    });
    state.reasons.push('resolution rules need human review');
  } else
    state.checks.push({
      id: 'resolution-rules',
      status: 'pass',
      detail: 'Question and rule text are present; semantic correctness is not assessed',
    });
  if (!isHttpsUrl(market.resolutionSource)) {
    state.escalate('caution');
    state.checks.push({
      id: 'resolution-source',
      status: 'caution',
      detail: 'A valid HTTPS resolution source URL is unavailable',
    });
    state.reasons.push('resolution source URL not verifiable');
  } else
    state.checks.push({
      id: 'resolution-source',
      status: 'pass',
      detail:
        'A declared resolution source is present; authority has not been independently adjudicated',
    });
}

function assessBook(book: OrderBook | null, now: number, state: AssessmentState): void {
  if (!book?.ask || !book.timestamp || !book.hash) {
    state.escalate('block');
    state.checks.push({
      id: 'order-book',
      status: 'block',
      detail: 'A timestamped CLOB ask and book hash could not be verified',
    });
    state.reasons.push('executable quote unavailable');
    return;
  }
  const age = now - book.timestamp;
  if (age < -2000 || age > 15_000) {
    state.escalate('block');
    state.checks.push({
      id: 'quote-freshness',
      status: 'block',
      detail: `CLOB snapshot age ${age}ms is outside the 15s review window`,
    });
    state.reasons.push('quote stale');
  } else
    state.checks.push({
      id: 'quote-freshness',
      status: 'pass',
      detail: `CLOB snapshot age ${Math.max(0, age)}ms`,
    });
  const spread = book.bid ? book.ask.price - book.bid.price : null;
  if (spread !== null && spread < 0) {
    state.escalate('block');
    state.checks.push({ id: 'spread', status: 'block', detail: 'CLOB best bid exceeds best ask' });
    state.reasons.push('order book is crossed');
  } else if (spread === null || spread > 0.08) {
    state.escalate('caution');
    state.checks.push({
      id: 'spread',
      status: 'caution',
      detail:
        spread === null
          ? 'No two-sided book; spread unavailable'
          : `Spread ${spread.toFixed(4)} exceeds the 0.08 review threshold`,
    });
    state.reasons.push('book is wide or one-sided');
  } else state.checks.push({ id: 'spread', status: 'pass', detail: `Spread ${spread.toFixed(4)}` });
  if (book.ask.size < 10) {
    state.escalate('caution');
    state.checks.push({
      id: 'top-ask-depth',
      status: 'caution',
      detail: `Best-ask depth is ${book.ask.size} shares, below the 10-share review threshold`,
    });
    state.reasons.push('top-of-book depth is thin');
  } else
    state.checks.push({
      id: 'top-ask-depth',
      status: 'pass',
      detail: `Best-ask depth ${book.ask.size} shares`,
    });
}

function assessEndDate(
  market: NormalizedPolymarketMarket,
  now: number,
  state: AssessmentState
): number {
  const endDateMs = market.endDate ? Date.parse(market.endDate) : NaN;
  if (Number.isFinite(endDateMs) && endDateMs <= now) {
    state.escalate('block');
    state.checks.push({ id: 'end-date', status: 'block', detail: 'Market end date has passed' });
    state.reasons.push('market end date passed');
  } else if (!Number.isFinite(endDateMs)) {
    state.escalate('caution');
    state.checks.push({
      id: 'end-date',
      status: 'caution',
      detail: 'No valid end date is available',
    });
    state.reasons.push('end date unknown');
  } else
    state.checks.push({
      id: 'end-date',
      status: 'pass',
      detail: 'Market end date is in the future',
    });
  return endDateMs;
}
async function getBook(assetId: string): Promise<OrderBook> {
  const response = await fetch(`${CLOB}/book?token_id=${encodeURIComponent(assetId)}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Polymarket CLOB returned ${response.status}`);
  const raw = record(await boundedJson(response, 2_000_000, 'CLOB'));
  if (!raw) throw new Error('Polymarket CLOB book is malformed');
  const levels = (value: unknown): Array<{ price: number; size: number }> => {
    if (!Array.isArray(value) || value.length > 5000)
      throw new Error('Polymarket CLOB levels are malformed');
    return value.map((item) => {
      const level = record(item);
      const price = finite(level?.price);
      const size = finite(level?.size);
      if (price === null || price < 0 || price > 1 || size === null || size <= 0)
        throw new Error('Polymarket CLOB level is invalid');
      return { price, size };
    });
  };
  const bids = levels(raw.bids);
  const asks = levels(raw.asks);
  const bid = bids.reduce<(typeof bids)[number] | null>(
    (best, level) => (!best || level.price > best.price ? level : best),
    null
  );
  const ask = asks.reduce<(typeof asks)[number] | null>(
    (best, level) => (!best || level.price < best.price ? level : best),
    null
  );
  const rawTime = finite(raw.timestamp);
  const timestamp = rawTime === null ? null : rawTime < 100_000_000_000 ? rawTime * 1000 : rawTime;
  const rawHash = typeof raw.hash === 'string' ? raw.hash : '';
  const hash = /^(?:0x)?[\da-f]{64}$/i.test(rawHash)
    ? `0x${rawHash.replace(/^0x/i, '').toLowerCase()}`
    : null;
  return { timestamp, hash, bid, ask };
}

/** Conservative binary-market screening. It reports market quality; it is not a forecast or trade instruction. */
export async function assessPolymarketMarket(input: PolymarketAssessmentInput) {
  const params = new URLSearchParams({ id: input.marketId, closed: 'any', limit: '1' });
  const payload = await gamma('/markets', params);
  const market = Array.isArray(payload) ? normalizePolymarketMarket(payload[0]) : null;
  if (!market) {
    return {
      schema: 'insight.polymarket-market-assessment.v1',
      verdict: 'BLOCK' as const,
      evaluatedAt: new Date().toISOString(),
      market: { id: input.marketId },
      outcome: { name: input.outcome, probability: null },
      quotes: null,
      checks: [
        { id: 'market', status: 'block' as const, detail: 'Market metadata could not be resolved' },
      ],
      reasons: ['market metadata unavailable'],
      scope: {
        transactionAuthority: 'none',
        forecast: 'not_provided',
        execution: 'not_performed',
        suitability: 'not_assessed',
      },
      disclosure:
        'Venue metadata unavailable. This is not an outcome forecast or trade authorization.',
    };
  }
  const state = createAssessmentState();
  assessLifecycle(market, state);
  const chosen = assessOutcomes(market, input.outcome, state);
  assessRulesAndSource(market, state);
  let book: OrderBook | null = null;
  if (chosen?.assetId) {
    try {
      book = await getBook(chosen.assetId);
    } catch {
      book = null;
    }
  }
  const now = Date.now();
  assessBook(book, now, state);
  const endDateMs = assessEndDate(market, now, state);
  const conditionId =
    market.conditionId && /^0x[\da-f]{64}$/i.test(market.conditionId)
      ? market.conditionId.toLowerCase()
      : null;
  const validEndDate = Number.isFinite(endDateMs) ? market.endDate : null;
  return {
    schema: 'insight.polymarket-market-assessment.v1',
    verdict: state.verdict,
    evaluatedAt: new Date(now).toISOString(),
    metadataSource: 'polymarket-gamma',
    market: {
      id: market.id,
      rulesDigest: market.rulesDigest,
      conditionId,
      protocolVersion: market.protocolVersion,
      slug: market.slug,
      question: market.question,
      endDate: validEndDate,
      active: market.active,
      closed: market.closed,
      resolutionSource: market.resolutionSource,
      liquidity: market.liquidity,
      volume: market.volume,
    },
    outcome: { name: chosen?.name ?? input.outcome, probability: chosen?.probability ?? null },
    quotes: book
      ? {
          source: 'polymarket-clob',
          bestBid: book.bid?.price ?? null,
          bestBidSize: book.bid?.size ?? null,
          bestAsk: book.ask?.price ?? null,
          bestAskSize: book.ask?.size ?? null,
          spread: book.bid && book.ask ? book.ask.price - book.bid.price : null,
          timestamp: book.timestamp ? new Date(book.timestamp).toISOString() : null,
          hash: book.hash,
        }
      : null,
    checks: state.checks,
    reasons: state.reasons,
    scope: {
      transactionAuthority: 'none',
      forecast: 'not_provided',
      execution: 'not_performed',
      suitability: 'not_assessed',
    },
    disclosure:
      'Venue metadata and public CLOB snapshot only. The 0.08 spread and 10-share depth caution thresholds are initial, uncalibrated policy defaults. This is a market-integrity screen, not an outcome forecast, investment recommendation, or execution authorization.',
  };
}
