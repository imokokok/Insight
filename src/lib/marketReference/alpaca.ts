/**
 * Alpaca stock-quote adapter for local development and integration checks.
 *
 * This module is intentionally not wired into the production market-reference
 * collector, database, API routes, or client bundles while commercial data
 * permission is pending. It requests latest quotes only and keeps credentials
 * on the server side.
 */

export type AlpacaStockFeed = 'sip' | 'iex' | 'delayed_sip' | 'boats' | 'overnight' | 'otc';

export interface AlpacaStockQuote {
  provider: 'alpaca';
  assetClass: 'us-equity';
  symbol: string;
  feed: AlpacaStockFeed;
  bid: number;
  ask: number;
  midpoint: number;
  bidSize: number | null;
  askSize: number | null;
  bidExchange: string | null;
  askExchange: string | null;
  timestamp: string;
  ageSeconds: number;
}

export interface FetchAlpacaStockQuotesOptions {
  apiKeyId: string;
  apiSecretKey: string;
  symbols: readonly string[];
  feed?: AlpacaStockFeed;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}

const BASE_URL = 'https://data.alpaca.markets/v2/stocks/quotes/latest';
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 60_000;
const MAX_SYMBOLS = 100;
const VALID_FEEDS = new Set<AlpacaStockFeed>([
  'sip',
  'iex',
  'delayed_sip',
  'boats',
  'overnight',
  'otc',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePositiveNumber(value: unknown, field: string): number {
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Alpaca returned an invalid ${field}`);
  }
  return parsed;
}

function parseOptionalSize(value: unknown, field: string): number | null {
  if (value === null || value === undefined) return null;
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Alpaca returned an invalid ${field}`);
  }
  return parsed;
}

function parseOptionalExchange(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error('Alpaca returned an invalid exchange code');
  return value;
}

function validateSymbols(symbols: readonly string[]): string[] {
  if (!Array.isArray(symbols) || symbols.length === 0 || symbols.length > MAX_SYMBOLS) {
    throw new Error(`Provide between 1 and ${MAX_SYMBOLS} Alpaca stock symbols`);
  }
  const normalized = symbols.map((symbol) => {
    if (typeof symbol !== 'string') throw new Error('Alpaca symbols must be strings');
    const value = symbol.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(value)) {
      throw new Error(`Invalid Alpaca stock symbol: ${symbol}`);
    }
    return value;
  });
  if (new Set(normalized).size !== normalized.length) {
    throw new Error('Alpaca stock symbols must not contain duplicates');
  }
  return normalized;
}

function parseQuote(
  symbol: string,
  feed: AlpacaStockFeed,
  value: unknown,
  nowMs: number
): AlpacaStockQuote {
  if (!isRecord(value)) throw new Error(`Alpaca omitted a valid quote for ${symbol}`);

  const bid = parsePositiveNumber(value.bp, `${symbol} bid`);
  const ask = parsePositiveNumber(value.ap, `${symbol} ask`);
  if (ask < bid) throw new Error(`Alpaca returned a crossed quote for ${symbol}`);

  if (typeof value.t !== 'string' || !Number.isFinite(Date.parse(value.t))) {
    throw new Error(`Alpaca returned an invalid timestamp for ${symbol}`);
  }
  const timestampMs = Date.parse(value.t);
  const ageSeconds = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));

  return {
    provider: 'alpaca',
    assetClass: 'us-equity',
    symbol,
    feed,
    bid,
    ask,
    midpoint: (bid + ask) / 2,
    bidSize: parseOptionalSize(value.bs, `${symbol} bid size`),
    askSize: parseOptionalSize(value.as, `${symbol} ask size`),
    bidExchange: parseOptionalExchange(value.bx),
    askExchange: parseOptionalExchange(value.ax),
    timestamp: new Date(timestampMs).toISOString(),
    ageSeconds,
  };
}

/** Fetch and validate latest U.S. equity quotes without persisting or publishing them. */
export async function fetchAlpacaStockQuotes(
  options: FetchAlpacaStockQuotesOptions
): Promise<AlpacaStockQuote[]> {
  const apiKeyId = options.apiKeyId.trim();
  const apiSecretKey = options.apiSecretKey.trim();
  if (!apiKeyId || !apiSecretKey) {
    throw new Error('Set APCA_API_KEY_ID and APCA_API_SECRET_KEY for the local Alpaca check');
  }

  const symbols = validateSymbols(options.symbols);
  const feed = options.feed ?? 'iex';
  if (!VALID_FEEDS.has(feed)) throw new Error(`Unsupported Alpaca stock feed: ${String(feed)}`);

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error(`Alpaca request timeout must be between 1 and ${MAX_TIMEOUT_MS} ms`);
  }

  const url = new URL(BASE_URL);
  url.searchParams.set('symbols', symbols.join(','));
  url.searchParams.set('feed', feed);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let body: unknown;
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'APCA-API-KEY-ID': apiKeyId,
        'APCA-API-SECRET-KEY': apiSecretKey,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const hint =
        response.status === 401 || response.status === 403
          ? 'check credentials and feed access'
          : 'retry later';
      throw new Error(`Alpaca Market Data HTTP ${response.status}; ${hint}`);
    }

    try {
      body = await response.json();
    } catch {
      throw new Error('Alpaca returned invalid JSON');
    }
  } finally {
    clearTimeout(timeout);
  }
  if (!isRecord(body)) {
    throw new Error('Alpaca returned an unexpected quotes response');
  }
  const quotesBySymbol = body.quotes;
  if (!isRecord(quotesBySymbol)) {
    throw new Error('Alpaca returned an unexpected quotes response');
  }

  const nowMs = (options.now ?? Date.now)();
  if (!Number.isFinite(nowMs)) throw new Error('Invalid local clock value');
  return symbols.map((symbol) => parseQuote(symbol, feed, quotesBySymbol[symbol], nowMs));
}
