/**
 * Solana DEX-derived market-reference universe.
 *
 * The CAIP-19 registry (`SOLANA_SPL_TOKEN_ADDRESSES`) is the single source of
 * truth for which Solana assets exist in this project. Both Solana price
 * sources — DexScreener and GeckoTerminal — price exactly that registry, so a
 * token registered for CAIP-19 identity automatically gains market-reference
 * coverage, and an unregistered symbol is never priced.
 *
 * Resource discipline: both vendors expose batch endpoints (DexScreener: up to
 * 30 addresses per request; GeckoTerminal: up to 100), so each adapter costs
 * exactly ONE HTTP request per collection run regardless of registry size —
 * the marginal cost of a new Solana asset is zero requests.
 */

import { SOLANA_SPL_TOKEN_ADDRESSES } from '@/lib/attestations/caip19';

/**
 * Symbol → SPL mint for every registered Solana asset. Solana uses the
 * project-internal chainId 0 (see caip19.ts), which is the only key present.
 */
export const SOLANA_DEX_PRICE_MINTS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(SOLANA_SPL_TOKEN_ADDRESSES).map(([symbol, byChain]) => [symbol, byChain[0]])
  )
);

/** Whether a market-reference symbol is priced by the Solana DEX sources. */
export function isSolanaDexPricedSymbol(symbol: string): boolean {
  return Boolean(SOLANA_DEX_PRICE_MINTS[symbol]);
}
