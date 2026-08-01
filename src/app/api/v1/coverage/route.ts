import { type NextRequest } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_PROTOCOL_TIER_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getAllActiveFeedsByProvider } from '@/lib/oracles/utils/dynamicFeedResolver';

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const feedsByProvider = await getAllActiveFeedsByProvider();

    // Build per-chain coverage
    const chainMap = new Map<
      number,
      {
        chainId: number;
        providers: Set<string>;
        symbols: Set<string>;
        categories: Set<string>;
        feedCount: number;
      }
    >();

    // Build per-provider coverage
    const providerMap = new Map<
      string,
      {
        provider: string;
        chains: Set<number>;
        symbols: Set<string>;
        categories: Set<string>;
        feedCount: number;
      }
    >();

    // Build per-symbol coverage
    const symbolMap = new Map<
      string,
      {
        symbol: string;
        providers: Set<string>;
        chains: Set<number>;
        categories: Set<string>;
        feedCount: number;
      }
    >();

    for (const [provider, feeds] of feedsByProvider.entries()) {
      // Provider-level aggregation
      if (!providerMap.has(provider)) {
        providerMap.set(provider, {
          provider,
          chains: new Set(),
          symbols: new Set(),
          categories: new Set(),
          feedCount: 0,
        });
      }
      const pEntry = providerMap.get(provider)!;

      for (const feed of feeds) {
        pEntry.chains.add(feed.chain_id);
        pEntry.symbols.add(feed.symbol);
        pEntry.categories.add(feed.category);
        pEntry.feedCount++;

        // Chain-level aggregation
        if (!chainMap.has(feed.chain_id)) {
          chainMap.set(feed.chain_id, {
            chainId: feed.chain_id,
            providers: new Set(),
            symbols: new Set(),
            categories: new Set(),
            feedCount: 0,
          });
        }
        const cEntry = chainMap.get(feed.chain_id)!;
        cEntry.providers.add(provider);
        cEntry.symbols.add(feed.symbol);
        cEntry.categories.add(feed.category);
        cEntry.feedCount++;

        // Symbol-level aggregation
        if (!symbolMap.has(feed.symbol)) {
          symbolMap.set(feed.symbol, {
            symbol: feed.symbol,
            providers: new Set(),
            chains: new Set(),
            categories: new Set(),
            feedCount: 0,
          });
        }
        const sEntry = symbolMap.get(feed.symbol)!;
        sEntry.providers.add(provider);
        sEntry.chains.add(feed.chain_id);
        sEntry.categories.add(feed.category);
        sEntry.feedCount++;
      }
    }

    // Serialize sets to arrays
    const byChain = Array.from(chainMap.values())
      .sort((a, b) => b.feedCount - a.feedCount)
      .map((entry) => ({
        chainId: entry.chainId,
        feedCount: entry.feedCount,
        providers: Array.from(entry.providers).sort(),
        symbols: Array.from(entry.symbols).sort(),
        categories: Array.from(entry.categories).sort(),
        providerCount: entry.providers.size,
        symbolCount: entry.symbols.size,
      }));

    const byProvider = Array.from(providerMap.values())
      .sort((a, b) => b.feedCount - a.feedCount)
      .map((entry) => ({
        provider: entry.provider,
        feedCount: entry.feedCount,
        chains: Array.from(entry.chains).sort((a, b) => a - b),
        symbols: Array.from(entry.symbols).sort(),
        categories: Array.from(entry.categories).sort(),
        chainCount: entry.chains.size,
        symbolCount: entry.symbols.size,
      }));

    const bySymbol = Array.from(symbolMap.values())
      .sort((a, b) => b.feedCount - a.feedCount)
      .map((entry) => ({
        symbol: entry.symbol,
        feedCount: entry.feedCount,
        providers: Array.from(entry.providers).sort(),
        chains: Array.from(entry.chains).sort((a, b) => a - b),
        categories: Array.from(entry.categories).sort(),
        providerCount: entry.providers.size,
        chainCount: entry.chains.size,
      }));

    // Summary
    const allFeeds = Array.from(feedsByProvider.values()).flat();
    const totalFeeds = allFeeds.length;
    const totalProviders = feedsByProvider.size;
    const totalSymbols = symbolMap.size;
    const totalChains = chainMap.size;

    // Single-point-of-failure analysis: symbols covered by only one provider
    const singleProviderSymbols = bySymbol
      .filter((s) => s.providerCount === 1)
      .map((s) => ({ symbol: s.symbol, provider: s.providers[0] }));

    const payload = {
      summary: {
        totalFeeds,
        totalProviders,
        totalSymbols,
        totalChains,
        singleProviderRiskCount: singleProviderSymbols.length,
      },
      byChain,
      byProvider,
      bySymbol,
      singleProviderRisk: singleProviderSymbols,
    };

    return createCachedJsonResponse(
      ApiResponseBuilder.success(payload, { requestId: context.requestId }),
      { preset: 'semiStatic' }
    );
  },
  {
    // Tier 3 protocol-level intelligence
    middlewares: V1_PROTOCOL_TIER_MIDDLEWARES,
  }
);
