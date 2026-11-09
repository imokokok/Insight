import chainlinkCatalog from '../constants/chainlinkCatalog.json';
import { CHAINLINK_PRICE_FEEDS } from '../services/chainlinkDataSources/priceFeedConfig';

/**
 * Documented dual-feed exceptions: on-chain verified 2026-11-09 (Base
 * mainnet) that BOTH the catalog and the curated proxies return the same
 * description ("ETH / USD" and "BTC / USD") and answer latestRoundData, so
 * each source pins a different live official proxy captured by a different
 * resync. Anything outside this list must agree byte-for-byte.
 */
const DOCUMENTED_DUAL_FEED_EXCEPTIONS = new Set(['ETH:8453', 'BTC:8453']);

type CatalogFeed = { base?: string; proxyAddress?: string };

describe('chainlink curated fallback parity with the catalog', () => {
  it('resolves every shared symbol/chain to the same proxy address', () => {
    const networks = chainlinkCatalog.networks as Record<string, CatalogFeed[]>;
    const mismatches: string[] = [];
    let compared = 0;

    for (const [chainId, feeds] of Object.entries(networks)) {
      for (const feed of feeds) {
        const symbol = feed.base;
        const proxy = feed.proxyAddress;
        if (!symbol || !proxy) continue;
        const key = `${symbol}:${chainId}`;
        if (DOCUMENTED_DUAL_FEED_EXCEPTIONS.has(key)) continue;

        const curated = CHAINLINK_PRICE_FEEDS[symbol]?.[Number(chainId)];
        if (!curated) continue; // the curated map may legitimately cover fewer symbols

        compared += 1;
        if (curated.address.toLowerCase() !== proxy.toLowerCase()) {
          mismatches.push(`${key}: curated=${curated.address} catalog=${proxy}`);
        }
      }
    }

    expect(compared).toBeGreaterThan(50);
    expect(mismatches).toEqual([]);
  });

  it('keeps the documented dual-feed exceptions live on both sides', () => {
    for (const key of DOCUMENTED_DUAL_FEED_EXCEPTIONS) {
      const [symbol, chainId] = key.split(':');
      expect(CHAINLINK_PRICE_FEEDS[symbol]?.[Number(chainId)]).toBeDefined();
      const feeds = (chainlinkCatalog.networks as Record<string, CatalogFeed[]>)[chainId] ?? [];
      expect(
        feeds.some((feed) => feed.base === symbol && typeof feed.proxyAddress === 'string')
      ).toBe(true);
    }
  });
});
