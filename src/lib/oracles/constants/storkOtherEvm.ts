import { Blockchain } from '@/types/oracle';

/** Stork pushed EVM feeds outside the existing Monad directory. */
export const STORK_OTHER_EVM_CONTRACTS: Readonly<
  Partial<Record<Blockchain, { chainId: number; address: `0x${string}` }>>
> = {
  [Blockchain.BNB_CHAIN]: {
    chainId: 56,
    address: '0x7D06cc8210228365896A3cc8Aac88c5551529112',
  },
  [Blockchain.BASE]: {
    chainId: 8453,
    address: '0x647DFd812BC1e116c6992CB2bC353b2112176fD6',
  },
  [Blockchain.HYPEREVM]: {
    chainId: 999,
    address: '0xacC0a0cF13571d30B4b8637996F5D6D774d4fd62',
  },
};

export interface StorkOtherEvmFeed {
  chain: Blockchain.BNB_CHAIN | Blockchain.BASE | Blockchain.HYPEREVM;
  chainId: number;
  alias: string;
  /** Exact Stork asset ID from the official pushed-assets directory. */
  assetId: string;
  encodedAssetId: `0x${string}`;
  /** Stork publishes these as reference-rate feeds, not direct USD spot prices. */
  maxStalenessSeconds: number;
  priceDeviationPercent: number;
}

function pushedFeed(
  chain: StorkOtherEvmFeed['chain'],
  alias: string,
  assetId: string,
  encodedAssetId: `0x${string}`
): StorkOtherEvmFeed {
  const contract = STORK_OTHER_EVM_CONTRACTS[chain];
  if (!contract) throw new Error(`Missing reviewed Stork contract for ${chain}`);
  return {
    chain,
    chainId: contract.chainId,
    alias,
    assetId,
    encodedAssetId,
    maxStalenessSeconds: 3600,
    priceDeviationPercent: 0.5,
  };
}

/**
 * Pushed assets published by Stork for BNB Smart Chain, Base and HyperEVM.
 * Their official triggers are 3600s / 0.5%; reads remain shadow-only and are
 * never promoted into strict oracle quorum by this integration.
 */
export const STORK_OTHER_EVM_PUSHED_FEEDS: readonly StorkOtherEvmFeed[] = [
  pushedFeed(
    Blockchain.BNB_CHAIN,
    'SUSNUSD_RR_NOON',
    'SUSNUSD_RR_NOON',
    '0x77003d6da8f95711efa901495c607c987dfaedd55d24c6f935286f2851ed915e'
  ),
  pushedFeed(
    Blockchain.BASE,
    'SUSNUSN_RR',
    'SUSNUSN_RR',
    '0xd29a4f8c6bfaab3bb2d1892248996a33db942d8af100aef635ba25b15a5013f0'
  ),
  pushedFeed(
    Blockchain.BASE,
    'USNUSD_RR_CAPPED_1',
    'USNUSD_RR_CAPPED_1',
    '0x980b98c48b802c650b260cc46c9c516cd3ed0873c66a52acb560c025cb4794f6'
  ),
  pushedFeed(
    Blockchain.HYPEREVM,
    'SUSNUSN_RR',
    'SUSNUSN_RR',
    '0xd29a4f8c6bfaab3bb2d1892248996a33db942d8af100aef635ba25b15a5013f0'
  ),
  pushedFeed(
    Blockchain.HYPEREVM,
    'USNUSD_RR_CAPPED_1',
    'USNUSD_RR_CAPPED_1',
    '0x980b98c48b802c650b260cc46c9c516cd3ed0873c66a52acb560c025cb4794f6'
  ),
] as const;

export function resolveStorkOtherEvmFeed(
  symbol: string,
  chain: Blockchain
): StorkOtherEvmFeed | null {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;
  return (
    STORK_OTHER_EVM_PUSHED_FEEDS.find(
      (feed) => feed.chain === chain && feed.alias.toUpperCase() === normalized
    ) ?? null
  );
}
