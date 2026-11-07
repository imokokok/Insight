/**
 * Canonical on-chain identities: EVM chain IDs, token contract addresses and
 * CAIP-19 asset-id helpers. Single source of truth shared by the x402 payment
 * layer, DEX guards, lending guards, TWAP oracle constants, MCP tooling and
 * docs.
 *
 * Rules for this registry:
 *   - Addresses are stored in EIP-55 checksummed form (EVM) or canonical
 *     base58 (Solana). Call sites that need lowercase form MUST derive it via
 *     `.toLowerCase()` so the canonical literal exists exactly once.
 *   - Tests intentionally keep literal copies of these values so an
 *     accidental registry change fails the test suite.
 *   - Per-provider feed registries (TWAP_TOKEN_ADDRESSES,
 *     SOLANA_SPL_TOKEN_ADDRESSES) keep their own structure but derive shared
 *     entries from here.
 */

/** EVM chain IDs used across the codebase. */
export const CHAIN_ID = {
  ETHEREUM: 1,
  OPTIMISM: 10,
  ARBITRUM: 42161,
  POLYGON: 137,
  BSC: 56,
  BASE: 8453,
  MONAD: 143,
  HYPEREVM: 999,
  AVALANCHE: 43114,
  FANTOM: 250,
  CRONOS: 25,
  SCROLL: 534352,
  ZKSYNC: 324,
  GNOSIS: 100,
  MANTLE: 5000,
  LINEA: 59144,
  BASE_SEPOLIA: 84532,
} as const;

export type EvmChainId = (typeof CHAIN_ID)[keyof typeof CHAIN_ID];

/** Canonical token contract addresses. */
export const TOKEN_ADDRESS = {
  /** Base mainnet USDC (Circle canonical deployment). */
  BASE_USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  /** Solana mainnet USDC mint (Circle canonical). */
  SOLANA_USDC_MINT: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
} as const;

/** Base mainnet USDC, checksummed. */
export const BASE_USDC_ADDRESS = TOKEN_ADDRESS.BASE_USDC;

/** Solana mainnet USDC mint, base58. */
export const SOLANA_USDC_MINT = TOKEN_ADDRESS.SOLANA_USDC_MINT;

/** CAIP-19 asset id for an ERC-20 on an EIP-155 chain. */
export const caip19Erc20 = (chainId: number, address: string): string =>
  `eip155:${chainId}/erc20:${address}`;
