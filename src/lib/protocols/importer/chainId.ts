import { Blockchain } from '@/types/oracle';

const BLOCKCHAIN_TO_CHAIN_ID: Partial<Record<Blockchain, number>> = {
  [Blockchain.ETHEREUM]: 1,
  [Blockchain.ARBITRUM]: 42161,
  [Blockchain.OPTIMISM]: 10,
  [Blockchain.POLYGON]: 137,
  [Blockchain.BASE]: 8453,
  [Blockchain.AVALANCHE]: 43114,
  [Blockchain.BNB_CHAIN]: 56,
};

export function getChainId(blockchain: Blockchain): number {
  const chainId = BLOCKCHAIN_TO_CHAIN_ID[blockchain];
  if (!chainId) {
    throw new Error(`Unsupported blockchain for on-chain import: ${blockchain}`);
  }
  return chainId;
}
