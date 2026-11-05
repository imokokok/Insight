/**
 * Reviewed Base lending deployment identities.
 *
 * These are deliberately a small, source-controlled set. A matching ABI is
 * not enough to admit a target into a signed decision: the target must also be
 * the canonical protocol deployment (or a documented Moonwell market). This
 * keeps a look-alike contract from being smuggled into an otherwise valid
 * exact-call attestation.
 */

import { BASE_USDC_ADDRESS } from '@/lib/constants/tokenAddresses';

export const COMPOUND_V3_BASE_COMET = '0xb125e6687d4313864e53df431d5425969c15eb2f' as const;
/** Compound V3 Base USDC. Comparison sites normalize with toLowerCase(), so
 * this intentionally stays lowercase; derived from the canonical registry. */
export const COMPOUND_V3_BASE_USDC = BASE_USDC_ADDRESS.toLowerCase() as `0x${string}`;

export const MOONWELL_BASE_COMPTROLLER = '0xfbb21d0380bee3312b33c4353c8936a0f13ef26c' as const;

/**
 * High-liquidity Moonwell Base markets published in Moonwell's contract
 * registry. The guard intentionally does not auto-admit newly listed markets:
 * adding one requires a review of its oracle and market controls first.
 */
export const MOONWELL_BASE_MARKETS = {
  USDC: '0xedc817a28e8b93b03976fbd4a3ddbc9f7d176c22',
  WETH: '0x628ff693426583d9a7fb391e54366292f509d457',
  CBBTC: '0xf877acafa28c19b96727966690b2f44d35ad5976',
  CBETH: '0x3bf93770f2d4a794c3d9ebefbaebae2a8f09a5e5',
  WSTETH: '0x627fe393bc6edda28e99ae648fd6ff362514304b',
  WEETH: '0xb8051464c8c92209c92f3a4cd9c73746c4c3cfb3',
  EURC: '0xb682c840b5f4fc58b20769e691a6fa1305a501a2',
} as const;

const MOONWELL_SYMBOL_ALIASES: Record<string, keyof typeof MOONWELL_BASE_MARKETS> = {
  ETH: 'WETH',
  WETH: 'WETH',
  BTC: 'CBBTC',
  CBBTC: 'CBBTC',
  CBBTCBASE: 'CBBTC',
  CBETH: 'CBETH',
  WSTETH: 'WSTETH',
  WEETH: 'WEETH',
  USDC: 'USDC',
  EURC: 'EURC',
};

export function canonicalMoonwellSymbol(symbol: string): keyof typeof MOONWELL_BASE_MARKETS | null {
  return MOONWELL_SYMBOL_ALIASES[symbol.trim().toUpperCase()] ?? null;
}

export function moonwellBaseMarketForSymbol(symbol: string): `0x${string}` | null {
  const canonical = canonicalMoonwellSymbol(symbol);
  return canonical ? (MOONWELL_BASE_MARKETS[canonical] as `0x${string}`) : null;
}

export const COMPOUND_V3_BASE_COLLATERAL_ASSETS = {
  WETH: '0x4200000000000000000000000000000000000006',
  CBETH: '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22',
} as const;

export function compoundV3BaseAssetForSymbol(symbol: string): `0x${string}` | null {
  const canonical = symbol.trim().toUpperCase() === 'ETH' ? 'WETH' : symbol.trim().toUpperCase();
  if (canonical === 'USDC') return COMPOUND_V3_BASE_USDC;
  return (
    (COMPOUND_V3_BASE_COLLATERAL_ASSETS[
      canonical as keyof typeof COMPOUND_V3_BASE_COLLATERAL_ASSETS
    ] as `0x${string}` | undefined) ?? null
  );
}

// ---------------------------------------------------------------------------
// P1-1a · Reviewed exact Morpho Blue Base markets (vault-reduction anchors)
// ---------------------------------------------------------------------------

/**
 * A reviewed, exact Morpho Blue Base market. This is a source-controlled ANCHOR
 * produced by a review — it is deliberately NOT a "vault address -> market"
 * whitelist. `vaultMarketMapping.ts` still reads `asset()`, the vault's market
 * queues and `idToMarketParams(id)` on-chain before it will reduce a vault to
 * one of these ids.
 */
export interface ReviewedMorphoBlueMarket {
  /** keccak256 of the immutable MarketParams tuple (bytes32). */
  marketId: `0x${string}`;
  /** ERC-20 that a compliant vault feeding this market must return from asset(). */
  loanAsset: `0x${string}`;
}

/**
 * Intentionally EMPTY at this commit: no first-party-verified Morpho Blue Base
 * `marketId` values were found anywhere in this repository, and inventing ids
 * would fabricate review evidence. The ERC-4626 vault path is enabled by
 * default but stays fail-closed (every vault is refused) until a review
 * registers concrete markets here, or a caller injects `reviewedMarkets`
 * through the guard dependencies. Registering is idempotent per marketId.
 */
const reviewedMorphoBlueBaseMarkets: ReviewedMorphoBlueMarket[] = [];

export function registerReviewedMorphoBlueMarket(market: ReviewedMorphoBlueMarket): void {
  const marketId = market.marketId.toLowerCase() as `0x${string}`;
  const normalized: ReviewedMorphoBlueMarket = {
    marketId,
    loanAsset: market.loanAsset.toLowerCase() as `0x${string}`,
  };
  const index = reviewedMorphoBlueBaseMarkets.findIndex(
    (entry) => entry.marketId.toLowerCase() === marketId
  );
  if (index >= 0) reviewedMorphoBlueBaseMarkets[index] = normalized;
  else reviewedMorphoBlueBaseMarkets.push(normalized);
}

export function getReviewedMorphoBlueMarkets(): readonly ReviewedMorphoBlueMarket[] {
  return reviewedMorphoBlueBaseMarkets;
}
