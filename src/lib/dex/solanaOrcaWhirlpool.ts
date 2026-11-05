/**
 * The immutable reviewed identities for the Solana swap-guard lanes on the
 * Orca Whirlpool program.  Values below were verified against mainnet account
 * state and the official whirlpool program layout:
 *
 *   - Pool state (whirlpool account) decoded live: config, mints, vaults,
 *     sqrtPrice.  The pool price is sqrtPrice^2 / 2^128 adjusted for token
 *     decimals (the USDC/USDT mints both use 6 decimals; SOL/USDC adjusts by
 *     10^(9-6) for the SOL side).
 *   - The whirlpool program is upgradeable (ProgramData authority
 *     GwH3Hiv5mACLX3ufTw1pFsrhSPon5tdw252DBs4Rx4PV at the time of review);
 *     that governance fact is disclosed, not gated on.
 *
 * Only the canonical legacy `swap` instruction (discriminator
 * 248,198,158,145,225,117,135,200 = sha256("global:swap")[0..8]) is admitted.
 * The swapV2/swap_v2/twoHop variants and any remaining-accounts-info shape are
 * outside the reviewed profile.
 */

export const ORCA_WHIRLPOOL_PROGRAM_ID = 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc' as const;
/** Canonical SPL Token program; Token-2022 variants are outside the profile. */
export const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as const;

import { SOLANA_USDC_MINT } from '@/lib/constants/tokenAddresses';

export { SOLANA_USDC_MINT };
export const SOLANA_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' as const;
export const SOLANA_WSOL_MINT = 'So11111111111111111111111111111111111111112' as const;

export const SOLANA_SWAP_GUARD_PROFILE_IDS = [
  'solana-orca-whirlpool-usdc-usdt-1',
  'solana-orca-whirlpool-sol-usdc-1',
] as const;
export type SolanaSwapGuardProfileId = (typeof SOLANA_SWAP_GUARD_PROFILE_IDS)[number];

/** Directions carry fixed source/destination symbols, independent of pool orientation. */
export const SOLANA_SWAP_GUARD_DIRECTIONS = [
  'usdc-to-usdt',
  'usdt-to-usdc',
  'usdc-to-sol',
  'sol-to-usdc',
] as const;
export type SolanaSwapGuardDirection = (typeof SOLANA_SWAP_GUARD_DIRECTIONS)[number];

export type SolanaSwapTokenSymbol = 'USDC' | 'USDT' | 'SOL';

const DIRECTION_SYMBOLS: Record<
  SolanaSwapGuardDirection,
  { source: SolanaSwapTokenSymbol; destination: SolanaSwapTokenSymbol }
> = {
  'usdc-to-usdt': { source: 'USDC', destination: 'USDT' },
  'usdt-to-usdc': { source: 'USDT', destination: 'USDC' },
  'usdc-to-sol': { source: 'USDC', destination: 'SOL' },
  'sol-to-usdc': { source: 'SOL', destination: 'USDC' },
};

export function swapDirectionSymbols(direction: SolanaSwapGuardDirection): {
  source: SolanaSwapTokenSymbol;
  destination: SolanaSwapTokenSymbol;
} {
  return DIRECTION_SYMBOLS[direction];
}

export type ReviewedSolanaSwapToken = {
  symbol: SolanaSwapTokenSymbol;
  mint: string;
  decimals: 6 | 9;
};

export type ReviewedSolanaSwapProfile = {
  venue: 'orca-whirlpool';
  market: 'USDC/USDT' | 'SOL/USDC';
  programId: typeof ORCA_WHIRLPOOL_PROGRAM_ID;
  pool: string;
  whirlpoolsConfig: string;
  tickSpacing: number;
  feeRate: number;
  protocolFeeRate: number;
  tokenA: ReviewedSolanaSwapToken;
  tokenB: ReviewedSolanaSwapToken;
};

/**
 * The reviewed mainnet identities.  The vaults are part of the pool's state and
 * are re-read live at assessment time; repeating them here prevents a live-read
 * regression from silently re-binding the pool to different vaults.
 *
 * `solana-orca-whirlpool-sol-usdc-1` identities were decoded live on
 * 2026-11-04 from the whirlpool account Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE
 * (the deepest USDC/WSOL pool on the canonical WhirlpoolsConfig), using the
 * same layout offsets documented in solanaSwapGuard.ts `decodeWhirlpoolState`.
 */
export const REVIEWED_SOLANA_SWAP_PROFILES: Record<
  SolanaSwapGuardProfileId,
  ReviewedSolanaSwapProfile & { vaultA: string; vaultB: string }
> = {
  'solana-orca-whirlpool-usdc-usdt-1': {
    venue: 'orca-whirlpool',
    market: 'USDC/USDT',
    programId: ORCA_WHIRLPOOL_PROGRAM_ID,
    pool: '4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4',
    whirlpoolsConfig: '2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ',
    vaultA: '4oY1eVHJrt7ywuFoQnAZwto4qcQip1QhYMAhD11PU4QL',
    vaultB: '4dSG9tKHZR4CAictyEnH9XuGZyKapodWXq5xyg7uFwE9',
    tickSpacing: 1,
    feeRate: 100,
    protocolFeeRate: 1300,
    tokenA: { symbol: 'USDC', mint: SOLANA_USDC_MINT, decimals: 6 },
    tokenB: { symbol: 'USDT', mint: SOLANA_USDT_MINT, decimals: 6 },
  },
  'solana-orca-whirlpool-sol-usdc-1': {
    venue: 'orca-whirlpool',
    market: 'SOL/USDC',
    programId: ORCA_WHIRLPOOL_PROGRAM_ID,
    pool: 'Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE',
    whirlpoolsConfig: '2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ',
    vaultA: 'EUuUbDcafPrmVTD5M6qoJAoyyNbihBhugADAxRMn5he9',
    vaultB: '2WLWEuKDgkDUccTpbwYp1GToYktiSB1cXvreHUwiSUVP',
    tickSpacing: 4,
    feeRate: 400,
    protocolFeeRate: 1300,
    tokenA: { symbol: 'SOL', mint: SOLANA_WSOL_MINT, decimals: 9 },
    tokenB: { symbol: 'USDC', mint: SOLANA_USDC_MINT, decimals: 6 },
  },
};

export function reviewedSolanaSwapProfile(
  profileId: SolanaSwapGuardProfileId
): ReviewedSolanaSwapProfile & { vaultA: string; vaultB: string } {
  return REVIEWED_SOLANA_SWAP_PROFILES[profileId];
}

function profileTokenBySymbol(
  profile: ReviewedSolanaSwapProfile,
  symbol: SolanaSwapTokenSymbol
): ReviewedSolanaSwapToken {
  if (profile.tokenA.symbol === symbol) return profile.tokenA;
  if (profile.tokenB.symbol === symbol) return profile.tokenB;
  throw new Error(`Reviewed profile ${profile.market} does not trade ${symbol}`);
}

export function profileSupportsDirection(
  profile: ReviewedSolanaSwapProfile,
  direction: SolanaSwapGuardDirection
): boolean {
  const { source, destination } = DIRECTION_SYMBOLS[direction];
  return (
    (profile.tokenA.symbol === source && profile.tokenB.symbol === destination) ||
    (profile.tokenB.symbol === source && profile.tokenA.symbol === destination)
  );
}

export function directionSourceToken(
  profile: ReviewedSolanaSwapProfile,
  direction: SolanaSwapGuardDirection
): ReviewedSolanaSwapToken {
  return profileTokenBySymbol(profile, DIRECTION_SYMBOLS[direction].source);
}

export function directionDestinationToken(
  profile: ReviewedSolanaSwapProfile,
  direction: SolanaSwapGuardDirection
): ReviewedSolanaSwapToken {
  return profileTokenBySymbol(profile, DIRECTION_SYMBOLS[direction].destination);
}

/** `true` when the pool's tokenA is the source token of the declared direction. */
export function directionAToB(
  profile: ReviewedSolanaSwapProfile,
  direction: SolanaSwapGuardDirection
): boolean {
  return profile.tokenA.symbol === DIRECTION_SYMBOLS[direction].source;
}
