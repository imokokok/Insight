import { getAllActiveFeedsByProvider } from '@/lib/oracles/utils/dynamicFeedResolver';
import { STABLECOINS } from '@/lib/stablecoins/config';

import { OracleSetupRecommendationInputSchema, SymbolQueryInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

export const getSymbolsTool: McpToolDefinition<typeof SymbolQueryInputSchema> = {
  name: 'get_symbols',
  description:
    'List supported asset symbols. Optionally filter by a search query. Use this when you are unsure whether a symbol is supported.',
  parameters: SymbolQueryInputSchema,
  handler: async (args) => {
    const feedsByProvider = await getAllActiveFeedsByProvider().catch(
      () => new Map<string, unknown[]>()
    );

    const symbolSet = new Set<string>();
    for (const feeds of feedsByProvider.values()) {
      for (const feed of feeds) {
        const symbol = (feed as { symbol?: string }).symbol;
        if (symbol) {
          symbolSet.add(symbol.toUpperCase());
        }
      }
    }

    let symbols = Array.from(symbolSet).sort();

    if (args.query) {
      const q = args.query.toUpperCase();
      symbols = symbols.filter((s) => s.includes(q));
    }

    if (symbols.length === 0) {
      return args.query
        ? `No supported symbols match "${args.query}".`
        : 'No supported symbols found.';
    }

    const lines = [
      `**Supported symbols${args.query ? ` matching "${args.query}"` : ''} (${symbols.length} total):**`,
      symbols.join(', '),
    ];

    return lines.join('\n');
  },
};

export const recommendOracleSetupTool: McpToolDefinition<
  typeof OracleSetupRecommendationInputSchema
> = {
  name: 'recommend_oracle_setup',
  description:
    'Recommend oracle provider setup for an asset based on active feeds. Use this to decide which providers to include in price feeds or risk analysis.',
  parameters: OracleSetupRecommendationInputSchema,
  handler: async (args) => {
    const feedsByProvider = await getAllActiveFeedsByProvider().catch(
      () => new Map<string, unknown[]>()
    );

    const targetSymbol = args.symbol.toUpperCase();
    const recommendations: Array<{ provider: string; chains: string[]; count: number }> = [];

    for (const [provider, feeds] of feedsByProvider.entries()) {
      const matchedFeeds = feeds.filter((feed) => {
        const symbol = (feed as { symbol?: string }).symbol;
        return symbol?.toUpperCase() === targetSymbol;
      });

      if (matchedFeeds.length === 0) continue;

      const chains = new Set<string>();
      for (const feed of matchedFeeds) {
        const chain = (feed as { chain?: string; chain_id?: number }).chain;
        if (chain) chains.add(chain);
      }

      recommendations.push({
        provider,
        chains: Array.from(chains).sort(),
        count: matchedFeeds.length,
      });
    }

    if (recommendations.length === 0) {
      return `No active oracle feeds found for ${targetSymbol}.`;
    }

    const lines = [
      `**Oracle setup recommendations for ${targetSymbol}**`,
      '',
      '**Available providers:**',
    ];

    for (const rec of recommendations.sort((a, b) => b.count - a.count)) {
      lines.push(
        `- ${rec.provider.toUpperCase()}: ${rec.count} feed(s)${rec.chains.length > 0 ? ` on ${rec.chains.join(', ')}` : ''}`
      );
    }

    lines.push(
      '',
      '**Suggestion:** Include at least 3 providers in your risk summary for robust consensus pricing.'
    );

    return lines.join('\n');
  },
};

export const getStablecoinListTool: McpToolDefinition<typeof SymbolQueryInputSchema> = {
  name: 'get_stablecoin_list',
  description: 'List all tracked stablecoin symbols.',
  parameters: SymbolQueryInputSchema,
  handler: async () => {
    const symbols = STABLECOINS.map((c) => c.symbol).sort();
    return `**Tracked stablecoins:** ${symbols.join(', ')}`;
  },
};
