/**
 * The immutable reviewed identities for the Solana swap-guard lane: an Orca
 * Whirlpool USDC/USDT pool on Solana mainnet.  Values below were verified
 * against mainnet account state and the official whirlpool program layout:
 *
 *   - Pool state (whirlpool account) decoded live: config, mints, vaults,
 *     sqrtPrice.  The pool price is sqrtPrice^2 / 2^128 adjusted for token
 *     decimals (both reviewed mints use 6 decimals).
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

export const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as const;
export const SOLANA_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' as const;

export const SOLANA_SWAP_GUARD_PROFILE_IDS = ['solana-orca-whirlpool-usdc-usdt-1'] as const;
export type SolanaSwapGuardProfileId = (typeof SOLANA_SWAP_GUARD_PROFILE_IDS)[number];
export type SolanaSwapGuardDirection = 'usdc-to-usdt' | 'usdt-to-usdc';

export type ReviewedSolanaSwapProfile = {
  venue: 'orca-whirlpool';
  market: 'USDC/USDT';
  programId: typeof ORCA_WHIRLPOOL_PROGRAM_ID;
  pool: string;
  whirlpoolsConfig: string;
  tickSpacing: number;
  feeRate: number;
  protocolFeeRate: number;
  tokenA: { symbol: 'USDC'; mint: typeof SOLANA_USDC_MINT; decimals: 6 };
  tokenB: { symbol: 'USDT'; mint: typeof SOLANA_USDT_MINT; decimals: 6 };
};

/**
 * The reviewed mainnet identities.  The vaults are part of the pool's state and
 * are re-read live at assessment time; repeating them here prevents a live-read
 * regression from silently re-binding the pool to different vaults.
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
};

export function reviewedSolanaSwapProfile(
  profileId: SolanaSwapGuardProfileId
): ReviewedSolanaSwapProfile & { vaultA: string; vaultB: string } {
  return REVIEWED_SOLANA_SWAP_PROFILES[profileId];
}
