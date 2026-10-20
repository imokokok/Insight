/**
 * DexScreener market-reference source (Solana DEX-derived prices).
 *
 * DexScreener indexes public on-chain DEX liquidity pools. Its free,
 * unauthenticated token endpoint returns every indexed pair for a batch of
 * mint addresses, so ONE request prices the whole Solana registry per run.
 *
 * Pair selection: a token typically trades in many pools; the deepest-liquidity
 * pair is the least manipulable representative and is what the aggregated
 * reference price should track. Price sanity follows the collector's
 * fail-closed ladder: present → finite → positive, else the symbol's row fails
 * auditable rather than writing a bad price.
 *
 * Rights: vendor-licensed, derived-analytics-only (see
 * `MARKET_REFERENCE_SOURCE_RIGHTS.dexscreener`) — raw venue quotes are never
 * re-served; only Insight-derived consensus and analytics are.
 */

import { SOLANA_DEX_PRICE_MINTS } from './solanaDexSources';

import type { BoundSpotFetcher } from './collector';

const DEXSCREENER_TOKENS_URL = 'https://api.dexscreener.com/tokens/v1/solana';

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

/** Deepest-liquidity pair per mint from a DexScreener batch pair list. */
function pickDeepestPairByMint(pairs: unknown[]): Map<string, Record<string, unknown>> {
  const deepest = new Map<string, Record<string, unknown>>();
  for (const entry of pairs) {
    const pair = asRecord(entry);
    if (!pair) continue;
    const baseToken = asRecord(pair.baseToken);
    const mint = typeof baseToken?.address === 'string' ? baseToken.address : null;
    if (!mint) continue;
    const liquidity = asRecord(pair.liquidity);
    const liquidityUsd = parsePositiveNumber(liquidity?.usd) ?? 0;
    const incumbent = deepest.get(mint);
    const incumbentLiquidity = incumbent
      ? (parsePositiveNumber(asRecord(incumbent.liquidity)?.usd) ?? 0)
      : -1;
    if (liquidityUsd > incumbentLiquidity) deepest.set(mint, pair);
  }
  return deepest;
}

/**
 * Bind a per-run fetcher. The batch response is fetched once per collection
 * run (lazy, shared Promise) and memoized — N symbols still cost one request.
 */
export function createDexScreenerFetcher(
  fetchImpl: typeof fetch,
  _now: () => number
): BoundSpotFetcher {
  const mints = Object.values(SOLANA_DEX_PRICE_MINTS);
  let batchPromise: Promise<Map<string, Record<string, unknown>>> | null = null;

  const loadBatch = (): Promise<Map<string, Record<string, unknown>>> => {
    if (!batchPromise) {
      batchPromise = (async () => {
        const response = await fetchImpl(`${DEXSCREENER_TOKENS_URL}/${mints.join(',')}`);
        if (!response.ok) {
          throw new Error(`dexscreener batch tokens ${response.status}`);
        }
        const body: unknown = await response.json();
        if (!Array.isArray(body)) {
          throw new Error('dexscreener batch tokens response is not a pair list');
        }
        return pickDeepestPairByMint(body);
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
    if (!mint) throw new Error(`dexscreener does not price Solana symbol ${symbol}`);

    const deepest = await loadBatch();
    const pair = deepest.get(mint);
    if (!pair) throw new Error(`dexscreener does not list ${symbol}/USD (no indexed Solana pool)`);

    const price = parsePositiveNumber(pair.priceUsd);
    if (price === null) throw new Error(`dexscreener ${symbol}/USD price is unusable`);

    return {
      exchange: 'dexscreener',
      symbol,
      price,
      volume: parsePositiveNumber(asRecord(pair.volume)?.h24),
      // DEX aggregators expose neither order books nor source timestamps; the
      // row's client-measured latency stays the freshness proxy.
      bid: null,
      ask: null,
      sourceObservedAt: null,
    };
  };
}
