/**
 * Stork feeds that Stork publishes to Monad mainnet itself.
 *
 * The asset ids and update policies are deliberately committed rather than
 * inferred at runtime: an unlisted or renamed Stork asset must never be
 * treated as a price feed. Source: Stork's Monad pushed-assets registry.
 */
export const STORK_MONAD_CHAIN_ID = 143;

export const STORK_MONAD_CONTRACT_ADDRESS = '0xacC0a0cF13571d30B4b8637996F5D6D774d4fd62' as const;

/** Official public Monad mainnet endpoints, in the order listed by Monad. */
export const STORK_MONAD_RPC_ENDPOINTS = [
  'https://rpc.monad.xyz',
  'https://rpc1.monad.xyz',
  'https://rpc2.monad.xyz',
  'https://rpc3.monad.xyz',
  'https://rpc-mainnet.monadinfra.com',
] as const;

export interface StorkMonadFeed {
  /** Insight's canonical symbol. */
  alias: string;
  /** Stork's plaintext asset identifier, hashed as keccak256(bytes(assetId)) on-chain. */
  assetId: string;
  /** Keccak256(assetId), verified against Stork's documented encoding. */
  encodedAssetId: `0x${string}`;
  /** Stork's published maximum age for the Monad pushed feed. */
  maxStalenessSeconds: number;
  /** Stork's published push threshold, expressed as a percentage. */
  priceDeviationPercent: number;
}

const pushedFeed = (
  alias: string,
  assetId: string,
  encodedAssetId: `0x${string}`,
  priceDeviationPercent: number
): StorkMonadFeed => ({
  alias,
  assetId,
  encodedAssetId,
  maxStalenessSeconds: 3600,
  priceDeviationPercent,
});

/**
 * Initial, high-liquidity Monad set. Add an asset only after its encoded id,
 * push policy, and direct contract read have been reviewed.
 */
export const STORK_MONAD_PUSHED_FEEDS: readonly StorkMonadFeed[] = [
  pushedFeed(
    'BTC/USD',
    'BTCUSD',
    '0x7404e3d104ea7841c3d9e6fd20adfe99b4ad586bc08d8f3bd3afef894cf184de',
    0.02
  ),
  pushedFeed(
    'ETH/USD',
    'ETHUSD',
    '0x59102b37de83bdda9f38ac8254e596f0d9ac61d2035c07936675e87342817160',
    0.02
  ),
  pushedFeed(
    'MON/USD',
    'MONUSD',
    '0xa4f6b07ae0c89e3f3cc03c1badcc3e9adffdf7206bafcd56d142979800887385',
    0.02
  ),
  pushedFeed(
    'USDC/USD',
    'USDCUSD',
    '0x7416a56f222e196d0487dce8a1a8003936862e7a15092a91898d69fa8bce290c',
    0.05
  ),
  pushedFeed(
    'USDT/USD',
    'USDTUSD',
    '0x6dcd0a8fb0460d4f0f98c524e06c10c63377cd098b589c0b90314bfb55751558',
    0.05
  ),
] as const;

const feedsByAlias = new Map(STORK_MONAD_PUSHED_FEEDS.map((feed) => [feed.alias, feed]));

export function resolveStorkMonadFeed(symbol: string): StorkMonadFeed | null {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;
  return feedsByAlias.get(normalized) ?? feedsByAlias.get(`${normalized}/USD`) ?? null;
}
