/**
 * GeckoTerminal market-reference source (Solana DEX-derived prices).
 *
 * GeckoTerminal indexes public on-chain DEX liquidity pools. Its free token
 * endpoint accepts up to 100 comma-separated addresses, so ONE request prices
 * the whole Solana registry per run. Together with DexScreener it forms the
 * two-source cross-check for Solana assets (both independent of the CEX layer,
 * derived from on-chain pools rather than order books).
 *
 * Price sanity follows the collector's fail-closed ladder: present → finite →
 * positive, else the symbol's row fails auditable rather than writing a bad
 * price.
 *
 * Rights: vendor-licensed, derived-analytics-only (see
 * `MARKET_REFERENCE_SOURCE_RIGHTS.geckoterminal`) — raw venue quotes are never
 * re-served; only Insight-derived consensus and analytics are.
 */

import { SOLANA_DEX_PRICE_MINTS } from './solanaDexSources';

import type { BoundSpotFetcher } from './collector';

const GECKOTERMINAL_NETWORK = 'solana';
const GECKOTERMINAL_TOKENS_URL = `https://api.geckoterminal.com/api/v2/networks/${GECKOTERMINAL_NETWORK}/tokens/multi`;

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

/** Mint → per-token attributes from a GeckoTerminal multi-address response. */
function indexTokensByMint(data: unknown[]): Map<string, Record<string, unknown>> {
  const byMint = new Map<string, Record<string, unknown>>();
  for (const entry of data) {
    const item = asRecord(entry);
    if (!item || item.type !== 'token') continue;
    const attributes = asRecord(item.attributes);
    if (!attributes) continue;
    const mint = typeof attributes.address === 'string' ? attributes.address : null;
    if (!mint) continue;
    byMint.set(mint, attributes);
  }
  return byMint;
}

/**
 * Bind a per-run fetcher. The batch response is fetched once per collection
 * run (lazy, shared Promise) and memoized — N symbols still cost one request.
 */
export function createGeckoTerminalFetcher(
  fetchImpl: typeof fetch,
  _now: () => number
): BoundSpotFetcher {
  const mints = Object.values(SOLANA_DEX_PRICE_MINTS);
  let batchPromise: Promise<Map<string, Record<string, unknown>>> | null = null;

  const loadBatch = (): Promise<Map<string, Record<string, unknown>>> => {
    if (!batchPromise) {
      batchPromise = (async () => {
        const response = await fetchImpl(`${GECKOTERMINAL_TOKENS_URL}/${mints.join(',')}`, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          throw new Error(`geckoterminal batch tokens ${response.status}`);
        }
        const body = asRecord(await response.json());
        const data = Array.isArray(body?.data) ? body.data : null;
        if (!data) {
          throw new Error('geckoterminal batch tokens response is not a token list');
        }
        return indexTokensByMint(data);
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
    if (!mint) throw new Error(`geckoterminal does not price Solana symbol ${symbol}`);

    const byMint = await loadBatch();
    const attributes = byMint.get(mint);
    if (!attributes) {
      throw new Error(`geckoterminal does not list ${symbol}/USD (no indexed Solana pool)`);
    }

    const price = parsePositiveNumber(attributes.price_usd);
    if (price === null) throw new Error(`geckoterminal ${symbol}/USD price is unusable`);

    return {
      exchange: 'geckoterminal',
      symbol,
      price,
      volume: parsePositiveNumber(asRecord(attributes.volume_usd)?.h24),
      // DEX aggregators expose neither order books nor source timestamps; the
      // row's client-measured latency stays the freshness proxy.
      bid: null,
      ask: null,
      sourceObservedAt: null,
    };
  };
}
