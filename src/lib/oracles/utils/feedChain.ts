import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { Blockchain, OracleProvider } from '@/types/oracle';

const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

export interface OracleFeedChainDescriptor {
  provider: string;
  chain_id: number;
  source?: string | null;
  metadata?: unknown;
}

function isSolanaPythSponsoredFeed(feed: OracleFeedChainDescriptor): boolean {
  if (
    feed.provider !== OracleProvider.PYTH ||
    feed.chain_id !== 0 ||
    feed.source !== 'pyth-solana-sponsored-registry' ||
    feed.metadata === null ||
    typeof feed.metadata !== 'object' ||
    Array.isArray(feed.metadata)
  ) {
    return false;
  }
  return (feed.metadata as Record<string, unknown>).solanaNetwork === SOLANA_MAINNET_CAIP2;
}

/**
 * Resolve a feed's actual chain without changing the legacy meaning of
 * `chain_id = 0` for generic/off-chain providers. Solana's numeric placeholder
 * is also zero in Insight, so only the source-bound Pyth metadata disambiguates
 * the native Solana Pyth Core rows.
 */
export function resolveOracleFeedBlockchain(
  feed: OracleFeedChainDescriptor
): Blockchain | undefined {
  if (isSolanaPythSponsoredFeed(feed)) return Blockchain.SOLANA;
  return getBlockchainByChainId(feed.chain_id);
}
