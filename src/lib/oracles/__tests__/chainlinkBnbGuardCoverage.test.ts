import { getFeedFromCatalog } from '@/lib/oracles/constants/chainlinkCatalogLoader';
import {
  getChainlinkPriceFeed,
  isPriceFeedSupported,
} from '@/lib/oracles/services/chainlinkDataSources';

/**
 * BNB perp guard on-chain read coverage.
 *
 * `bnbPerpGuard` assesses BTC (underlying) and USDT (margin) with a
 * chain-agnostic cross-oracle consensus, but any BNB-native Chainlink read
 * (`chainlinkOnChainService` on chain 56) must resolve every asset the guard
 * can assess. The catalog directory is the official universe; the curated
 * hardcoded map is the no-DB fallback, so both paths must agree per asset.
 */
describe('chainlink BNB (chain 56) perp guard asset coverage', () => {
  const GUARD_ASSETS = ['BTC', 'ETH', 'USDT'] as const;

  it.each(GUARD_ASSETS)('resolves the %s / USD feed on chain 56 on both paths', (symbol) => {
    const feed = getChainlinkPriceFeed(symbol, 56);
    expect(feed).not.toBeNull();
    expect(isPriceFeedSupported(symbol, 56)).toBe(true);

    const catalogFeed = getFeedFromCatalog(symbol, 56);
    expect(catalogFeed).not.toBeNull();
    expect(feed!.address).toBe(catalogFeed!.address);
  });

  it.each(GUARD_ASSETS)('uses 8 decimals for the %s / USD feed on chain 56', (symbol) => {
    const feed = getChainlinkPriceFeed(symbol, 56);
    expect(feed!.decimals).toBe(8);
  });
});
