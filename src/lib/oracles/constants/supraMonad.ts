/**
 * Supra DORA Push feeds deployed on Monad mainnet.
 *
 * Source: Monad's public protocol registry (`mainnet/supra_oracles.jsonc`),
 * paired with Supra's public data-feed index. The two sources are required:
 * the Monad registry says which pair indices are pushed on this chain, while
 * Supra's index supplies the asset, quote, and feed-quality semantics.
 *
 * The catalog intentionally retains entries that may be temporarily unusable.
 * The on-chain reader rejects zero or stale values and the feed seeder only
 * activates a feed after a successful direct read. Keeping the full reviewed
 * catalog makes a later recovery visible without guessing a new pair index.
 */
export const SUPRA_MONAD_CHAIN_ID = 143;

export const SUPRA_MONAD_SVALUE_FEED_ADDRESS =
  '0x58e158c74DF7Ad6396C0dcbadc4878faC9e93d57' as const;

export const SUPRA_MONAD_RPC_ENDPOINTS = [
  'https://rpc.monad.xyz',
  'https://rpc1.monad.xyz',
  'https://rpc2.monad.xyz',
  'https://rpc3.monad.xyz',
  'https://rpc-mainnet.monadinfra.com',
] as const;

/** Direct observations older than 30 minutes are never returned to callers. */
export const SUPRA_MONAD_MAX_STALENESS_SECONDS = 30 * 60;

export type SupraMonadFeedQuality = 'premium' | 'standard' | 'under-supervision' | 'deprecated';
export type SupraMonadQuoteAsset = 'USD' | 'USDT' | 'USDC' | 'WETH' | 'BTC' | 'SUI';

export interface SupraMonadFeed {
  /** Canonical pair exactly matching the source quote; `.RR` denotes a rate. */
  alias: string;
  pairIndex: number;
  quoteAsset: SupraMonadQuoteAsset;
  quality: SupraMonadFeedQuality;
  /** Non-USD denomination/rate feeds must never be mistaken for direct USD prices. */
  quoteType: 'price' | 'reference-rate';
  maxStalenessSeconds: number;
}

const pushedFeed = (
  alias: string,
  pairIndex: number,
  quoteAsset: SupraMonadQuoteAsset,
  quality: SupraMonadFeedQuality,
  quoteType: SupraMonadFeed['quoteType'] = 'price'
): SupraMonadFeed => ({
  alias,
  pairIndex,
  quoteAsset,
  quality,
  quoteType,
  maxStalenessSeconds: SUPRA_MONAD_MAX_STALENESS_SECONDS,
});

/**
 * Every pair index that Monad registers for Supra DORA Push. Do not silently
 * re-label USDT/USDC quotes as USD: the exact source denomination is evidence
 * that downstream policy can inspect.
 */
export const SUPRA_MONAD_PUSHED_FEEDS: readonly SupraMonadFeed[] = [
  pushedFeed('LINK/USDT', 2, 'USDT', 'premium'),
  pushedFeed('DOGE/USDT', 3, 'USDT', 'premium'),
  pushedFeed('AVAX/USDT', 5, 'USDT', 'premium'),
  pushedFeed('AAVE/USDT', 7, 'USDT', 'premium'),
  pushedFeed('UNI/USDT', 8, 'USDT', 'premium'),
  pushedFeed('XRP/USDT', 14, 'USDT', 'premium'),
  pushedFeed('ADA/USDT', 16, 'USDT', 'premium'),
  pushedFeed('DAI/USDT', 41, 'USDT', 'deprecated'),
  pushedFeed('USDT/USD', 48, 'USD', 'premium'),
  pushedFeed('BNB/USDT', 49, 'USDT', 'premium'),
  pushedFeed('ARB/USDT', 80, 'USDT', 'standard'),
  pushedFeed('USDC/USD', 89, 'USD', 'premium'),
  pushedFeed('SUI/USDT', 90, 'USDT', 'premium'),
  pushedFeed('STG/USDT', 91, 'USDT', 'deprecated'),
  pushedFeed('APT/USDT', 104, 'USDT', 'premium'),
  pushedFeed('OP/USDT', 107, 'USDT', 'premium'),
  pushedFeed('CAKE/USDT', 125, 'USDT', 'premium'),
  pushedFeed('STETH/USDT', 149, 'USDT', 'under-supervision'),
  pushedFeed('WBTC/USDT', 166, 'USDT', 'standard'),
  pushedFeed('USDY/USDC', 172, 'USDC', 'under-supervision'),
  pushedFeed('PYTH/USDT', 183, 'USDT', 'standard'),
  pushedFeed('PYUSD/USDT', 194, 'USDT', 'under-supervision'),
  pushedFeed('POL/USDT', 197, 'USDT', 'under-supervision'),
  pushedFeed('TIA/USDT', 205, 'USDT', 'premium'),
  pushedFeed('SEI/USDT', 208, 'USDT', 'standard'),
  pushedFeed('WETH/USDT', 211, 'USDT', 'under-supervision'),
  pushedFeed('AXL/USDT', 215, 'USDT', 'premium'),
  pushedFeed('STONE/WETH.RR', 327, 'WETH', 'under-supervision', 'reference-rate'),
  pushedFeed('WSTETH/USDC', 436, 'USDC', 'under-supervision'),
  pushedFeed('WEETH/WETH.RR', 443, 'WETH', 'under-supervision', 'reference-rate'),
  pushedFeed('USDE/USDT', 461, 'USDT', 'under-supervision'),
  pushedFeed('RSETH/WETH.RR', 468, 'WETH', 'under-supervision', 'reference-rate'),
  pushedFeed('EZETH/WETH.RR', 469, 'WETH', 'under-supervision', 'reference-rate'),
  pushedFeed('FDUSD/USDT', 474, 'USDT', 'premium'),
  pushedFeed('ZRO/USDT', 486, 'USDT', 'premium'),
  pushedFeed('SBTC/BTC.RR', 510, 'BTC', 'premium', 'reference-rate'),
  pushedFeed('BERA/USDT', 528, 'USDT', 'premium'),
  pushedFeed('LBTC/SUI.RR', 537, 'SUI', 'under-supervision', 'reference-rate'),
  pushedFeed('USD1/USDT', 550, 'USDT', 'standard'),
] as const;

const feedsByAlias = new Map(SUPRA_MONAD_PUSHED_FEEDS.map((feed) => [feed.alias, feed]));
const bareStableQuoteFeeds = new Map<string, SupraMonadFeed>();

for (const feed of SUPRA_MONAD_PUSHED_FEEDS) {
  const [base] = feed.alias.split('/');
  if (
    base &&
    feed.quoteType === 'price' &&
    (feed.quoteAsset === 'USD' || feed.quoteAsset === 'USDT' || feed.quoteAsset === 'USDC') &&
    !bareStableQuoteFeeds.has(base)
  ) {
    bareStableQuoteFeeds.set(base, feed);
  }
}

/** Resolve an exact source pair, or a bare asset when its source quote is a stablecoin. */
export function resolveSupraMonadFeed(symbol: string): SupraMonadFeed | null {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;
  return feedsByAlias.get(normalized) ?? bareStableQuoteFeeds.get(normalized) ?? null;
}
