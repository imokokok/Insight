/**
 * Official Coinbase Tokenized Stocks API client (issuer reference data).
 *
 * Source of truth (Base official docs, fetched 2026-11-15):
 *   https://docs.base.org/build-on-base/integrate-defi/list-tokenized-stocks
 * The API is keyless and paginated. `nav_price` is the issuer's Chainlink NAV
 * reference — not a live bid/ask or execution price — and the feed stops
 * updating off-hours by design ("never settle or liquidate against a frozen
 * feed"), so `nav_price_updated_at` staleness is policy-relevant, not a bug.
 *
 * This client is reference-data transport only: it never enters the oracle
 * quorum and never signs anything. All policy lives in
 * tokenizedStockGuard.ts; callers may inject `fetchImpl` for tests.
 */

import { z } from 'zod';

const DEFAULT_BASE_URL = 'https://api.coinbase.com/v1';
export const TOKENIZED_STOCKS_REQUEST_TIMEOUT_MS = 10_000;
export const TOKENIZED_STOCKS_CACHE_MS = 60_000;
export const TOKENIZED_STOCKS_MAX_PAGES = 5;

const TokenizedStocksApiTokenSchema = z
  .object({
    symbol: z.string().min(1).max(24),
    contract_address: z.string().optional(),
    nav_price: z.union([z.number(), z.string()]).optional(),
    nav_price_updated_at: z.string().optional(),
    multiplier: z.union([z.number(), z.string()]).optional(),
    paused_features: z.array(z.string()).optional(),
  })
  .passthrough();

const TokenizedStocksApiPageSchema = z
  .object({
    tokens: z.array(TokenizedStocksApiTokenSchema).min(1),
    next_page_token: z.string().optional(),
  })
  .passthrough();

export interface TokenizedStockQuote {
  symbol: string;
  contractAddress: string | null;
  navPrice: number | null;
  navPriceUpdatedAt: string | null;
  multiplier: number | null;
  pausedFeatures: string[];
}

export class TokenizedStocksClientError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'TokenizedStocksClientError';
  }
}

export interface TokenizedStocksClient {
  /** Case-insensitive lookup of one tokenized stock by its listed symbol. */
  getQuote(asset: string): Promise<TokenizedStockQuote | null>;
}

export interface TokenizedStocksClientOptions {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  cacheMs?: number;
  now?: () => number;
}

function toNumber(value: number | string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toQuote(raw: z.infer<typeof TokenizedStocksApiTokenSchema>): TokenizedStockQuote {
  return {
    symbol: raw.symbol,
    contractAddress: raw.contract_address ?? null,
    navPrice: toNumber(raw.nav_price),
    navPriceUpdatedAt: raw.nav_price_updated_at ?? null,
    multiplier: toNumber(raw.multiplier),
    pausedFeatures: Array.isArray(raw.paused_features) ? raw.paused_features : [],
  };
}

/**
 * In-process client with a single-flight TTL cache over the paginated token
 * directory. A failed refresh drops the cached entry so the next call
 * retries instead of serving stale directory data past the TTL.
 */
export function createTokenizedStocksClient(
  options: TokenizedStocksClientOptions = {}
): TokenizedStocksClient {
  const baseUrl = (
    options.baseUrl ??
    (process.env.TOKENIZED_STOCKS_API_BASE_URL?.trim() || DEFAULT_BASE_URL)
  ).replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl ?? fetch;
  const cacheMs = options.cacheMs ?? TOKENIZED_STOCKS_CACHE_MS;
  const now = options.now ?? Date.now;
  let cache: { expiresAtMs: number; quotes: Map<string, TokenizedStockQuote> } | null = null;
  let inFlight: Promise<Map<string, TokenizedStockQuote>> | null = null;

  async function loadDirectory(): Promise<Map<string, TokenizedStockQuote>> {
    if (cache && cache.expiresAtMs > now()) return cache.quotes;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      const quotes = new Map<string, TokenizedStockQuote>();
      let pageToken: string | undefined;
      for (let page = 0; page < TOKENIZED_STOCKS_MAX_PAGES; page += 1) {
        const url = new URL(`${baseUrl}/tokenized-stocks`);
        url.searchParams.set('page_size', '500');
        if (pageToken) url.searchParams.set('page_token', pageToken);
        let response: Response;
        try {
          response = await fetchImpl(url.toString(), {
            headers: { accept: 'application/json' },
            signal: AbortSignal.timeout(TOKENIZED_STOCKS_REQUEST_TIMEOUT_MS),
          });
        } catch (error) {
          throw new TokenizedStocksClientError(
            'tokenized-stocks directory request failed',
            error instanceof Error ? error : undefined
          );
        }
        if (!response.ok) {
          throw new TokenizedStocksClientError(
            `tokenized-stocks directory returned HTTP ${response.status}`
          );
        }
        const parsed = TokenizedStocksApiPageSchema.safeParse(await response.json());
        if (!parsed.success) {
          throw new TokenizedStocksClientError('tokenized-stocks directory payload is malformed');
        }
        for (const token of parsed.data.tokens) {
          const quote = toQuote(token);
          quotes.set(quote.symbol.toLowerCase(), quote);
        }
        pageToken = parsed.data.next_page_token;
        if (!pageToken) break;
      }
      if (quotes.size === 0) {
        throw new TokenizedStocksClientError('tokenized-stocks directory is empty');
      }
      cache = { expiresAtMs: now() + cacheMs, quotes };
      return quotes;
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }

  return {
    async getQuote(asset: string): Promise<TokenizedStockQuote | null> {
      const directory = await loadDirectory();
      return directory.get(asset.trim().toLowerCase()) ?? null;
    },
  };
}

/** Shared process-wide client. Tests inject their own via dependencies. */
let sharedClient: TokenizedStocksClient | null = null;

export function defaultTokenizedStocksClient(): TokenizedStocksClient {
  sharedClient ??= createTokenizedStocksClient();
  return sharedClient;
}
