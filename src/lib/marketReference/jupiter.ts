/**
 * Jupiter Lite market-reference source (Solana baseline price).
 *
 * Jupiter is Solana's dominant swap aggregator, so its price API reflects the
 * deepest aggregated Solana liquidity and serves as the BASELINE for the
 * Solana market-reference trio: Jupiter (baseline) × DexScreener ×
 * GeckoTerminal cross-check. The Lite host (lite-api.jup.ag) is Jupiter's
 * documented free tier (1 request/second, unauthenticated); the paid
 * api.jup.ag host is deliberately NOT used here.
 *
 * Batch semantics: the `ids` parameter accepts comma-separated mints, so ONE
 * request prices the whole Solana registry per run. Mints Jupiter cannot price
 * are simply ABSENT from the response (verified live) — absence is an
 * auditable failed row, not an error of transport.
 *
 * Price sanity follows the collector's fail-closed ladder: present → finite →
 * positive, else the symbol's row fails auditable rather than writing a bad
 * price.
 *
 * Rights: vendor-licensed, derived-analytics-only (see
 * `MARKET_REFERENCE_SOURCE_RIGHTS.jupiter`) — raw venue quotes are never
 * re-served; only Insight-derived consensus and analytics are.
 */

import { SOLANA_DEX_PRICE_MINTS } from './solanaDexSources';

import type { BoundSpotFetcher } from './collector';

const JUPITER_LITE_PRICE_URL = 'https://lite-api.jup.ag/price/v3';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Mint → v3 price entry from a Jupiter Lite batch response. */
function indexPricesByMint(body: unknown): Map<string, Record<string, unknown>> {
  const top = asRecord(body);
  if (!top) throw new Error('jupiter batch prices response is not a mint map');
  const byMint = new Map<string, Record<string, unknown>>();
  for (const [mint, entry] of Object.entries(top)) {
    const attributes = asRecord(entry);
    if (attributes) byMint.set(mint, attributes);
  }
  return byMint;
}

/**
 * Bind a per-run fetcher. The batch response is fetched once per collection
 * run (lazy, shared Promise) and memoized — N symbols still cost one request.
 */
export function createJupiterLiteFetcher(
  fetchImpl: typeof fetch,
  _now: () => number
): BoundSpotFetcher {
  const mints = Object.values(SOLANA_DEX_PRICE_MINTS);
  let batchPromise: Promise<Map<string, Record<string, unknown>>> | null = null;

  const loadBatch = (): Promise<Map<string, Record<string, unknown>>> => {
    if (!batchPromise) {
      batchPromise = (async () => {
        const url = `${JUPITER_LITE_PRICE_URL}?ids=${mints.join(',')}`;
        const response = await fetchImpl(url);
        if (!response.ok) {
          throw new Error(`jupiter batch prices ${response.status}`);
        }
        return indexPricesByMint(await response.json());
      })();
      // A failed batch must remain retryable within the same run (the next
      // symbol's call re-issues the request instead of replaying the rejection).
      batchPromise.catch(() => {
        batchPromise = null;
      });
    }
    return batchPromise;
  };

  return async (symbol: string) => {
    const mint = SOLANA_DEX_PRICE_MINTS[symbol];
    if (!mint) throw new Error(`jupiter does not price Solana symbol ${symbol}`);

    const byMint = await loadBatch();
    const entry = byMint.get(mint);
    if (!entry) throw new Error(`jupiter does not list ${symbol}/USD (no aggregated Solana route)`);

    const price = parsePositiveNumber(entry.usdPrice);
    if (price === null) throw new Error(`jupiter ${symbol}/USD price is unusable`);

    return {
      exchange: 'jupiter',
      symbol,
      price,
      // v3 provides aggregate liquidity and 24h price change, not 24h venue
      // volume; volume stays null rather than misusing a different metric.
      volume: null,
      // Aggregator quotes expose neither order books nor source timestamps;
      // the row's client-measured latency stays the freshness proxy.
      bid: null,
      ask: null,
      sourceObservedAt: null,
    };
  };
}
