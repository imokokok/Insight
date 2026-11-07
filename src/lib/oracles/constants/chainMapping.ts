import { CHAIN_ID } from '@/lib/constants/tokenAddresses';
import { Blockchain } from '@/types/oracle';

export const BLOCKCHAIN_TO_CHAIN_ID: Record<Blockchain, number> = {
  [Blockchain.ETHEREUM]: CHAIN_ID.ETHEREUM,
  [Blockchain.ARBITRUM]: CHAIN_ID.ARBITRUM,
  [Blockchain.OPTIMISM]: CHAIN_ID.OPTIMISM,
  [Blockchain.POLYGON]: CHAIN_ID.POLYGON,
  [Blockchain.AVALANCHE]: CHAIN_ID.AVALANCHE,
  [Blockchain.BNB_CHAIN]: CHAIN_ID.BSC,
  [Blockchain.BASE]: CHAIN_ID.BASE,
  [Blockchain.SOLANA]: 0,
  [Blockchain.FANTOM]: CHAIN_ID.FANTOM,
  [Blockchain.CRONOS]: CHAIN_ID.CRONOS,
  [Blockchain.JUNO]: 0,
  [Blockchain.COSMOS]: 0,
  [Blockchain.OSMOSIS]: 0,
  [Blockchain.SCROLL]: CHAIN_ID.SCROLL,
  [Blockchain.ZKSYNC]: CHAIN_ID.ZKSYNC,
  [Blockchain.APTOS]: 0,
  [Blockchain.SUI]: 0,
  [Blockchain.GNOSIS]: CHAIN_ID.GNOSIS,
  [Blockchain.MANTLE]: CHAIN_ID.MANTLE,
  [Blockchain.LINEA]: CHAIN_ID.LINEA,
  [Blockchain.CELESTIA]: 0,
  [Blockchain.INJECTIVE]: 0,
  [Blockchain.SEI]: 0,
  [Blockchain.TRON]: 0,
  [Blockchain.TON]: 0,
  [Blockchain.NEAR]: 0,
  [Blockchain.AURORA]: 1313161554,
  [Blockchain.CELO]: 42220,
  [Blockchain.STARKNET]: 0,
  [Blockchain.BLAST]: 81457,
  [Blockchain.CARDANO]: 0,
  [Blockchain.POLKADOT]: 0,
  [Blockchain.KAVA]: 2222,
  [Blockchain.MOONBEAM]: 1284,
  [Blockchain.MOONRIVER]: 1285,
  [Blockchain.METIS]: 1088,
  [Blockchain.STARKEX]: 0,
  [Blockchain.STELLAR]: 0,
  [Blockchain.FLARE]: 14,
  [Blockchain.SUPRA_CHAIN]: 8,
  // BandChain is Cosmos-SDK based and has no EVM numeric chain id.
  [Blockchain.BANDCHAIN]: 0,
  // Monad mainnet (chainId 143 verified via eth_chainId against rpc.monad.xyz, 2026-10-19).
  [Blockchain.MONAD]: 143,
  // HyperEVM mainnet (chainId 999 verified via eth_chainId against
  // rpc.hyperliquid.xyz/evm, 2026-11-08).
  [Blockchain.HYPEREVM]: CHAIN_ID.HYPEREVM,
};

// Reverse mapping: chain_id → Blockchain.
// chainId=0 (chain-agnostic: Solana/Juno/Cosmos/etc.) is intentionally
// excluded so lookups for 0 return undefined, signaling the caller to fall
// back to the client's default chain. All positive chainIds are unique.
export const CHAIN_ID_TO_BLOCKCHAIN: Readonly<Record<number, Blockchain>> = Object.fromEntries(
  Object.entries(BLOCKCHAIN_TO_CHAIN_ID)
    .filter(([, id]) => id > 0)
    .map(([bc, id]) => [id, bc as Blockchain])
) as Readonly<Record<number, Blockchain>>;

/**
 * Resolve a Blockchain from a numeric chain_id.
 * Returns undefined for chain-agnostic (0) / unknown / falsy chainIds so the
 * caller can fall back to the client's default chain.
 */
export function getBlockchainByChainId(chainId: number | undefined | null): Blockchain | undefined {
  if (!chainId || chainId <= 0) return undefined;
  return CHAIN_ID_TO_BLOCKCHAIN[chainId];
}
