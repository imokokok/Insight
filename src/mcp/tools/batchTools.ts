import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

import { formatAsText, formatPrice, formatTimestamp } from './formatters';
import { BatchPriceInputSchema, PriceHistoryInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

export const getOraclePricesBatchTool: McpToolDefinition<typeof BatchPriceInputSchema> = {
  name: 'get_oracle_prices_batch',
  description: 'Fetch prices for multiple assets/providers in a single request. Up to 20 queries.',
  parameters: BatchPriceInputSchema,
  handler: async (args) => {
    const results = await Promise.all(
      args.queries.map(async (query) => {
        try {
          const price = await fetchPriceWithDatabase(
            query.provider as OracleProvider,
            query.symbol,
            query.chain as Blockchain | undefined,
            true,
            args.forceRefresh
          );
          return {
            provider: query.provider,
            symbol: query.symbol,
            chain: query.chain,
            price,
            error: null as string | null,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          return {
            provider: query.provider,
            symbol: query.symbol,
            chain: query.chain,
            price: null,
            error: message,
          };
        }
      })
    );

    const lines = [`**Batch price results (${results.length} queries)**`, '', '**Successful:**'];

    const successes = results.filter((r) => r.error === null && r.price !== null);
    const failures = results.filter((r) => r.error !== null);

    if (successes.length === 0) {
      lines.push('No successful prices.');
    } else {
      for (const r of successes) {
        lines.push(
          `- ${r.provider.toUpperCase()} ${r.symbol}${r.chain ? ` @ ${r.chain}` : ''}: $${formatPrice(r.price!.price)} @ ${formatTimestamp(r.price!.timestamp)}`
        );
      }
    }

    if (failures.length > 0) {
      lines.push('', '**Failures:**');
      for (const r of failures) {
        lines.push(
          `- ${r.provider.toUpperCase()} ${r.symbol}${r.chain ? ` @ ${r.chain}` : ''}: ${r.error}`
        );
      }
    }

    return lines.join('\n');
  },
};

export const getPriceHistoryTool: McpToolDefinition<typeof PriceHistoryInputSchema> = {
  name: 'get_price_history',
  description:
    'Get historical price data for an asset from a specific oracle provider over a period (in hours).',
  parameters: PriceHistoryInputSchema,
  handler: async (args) => {
    const { handleGetHistoricalPrices } = await import('@/lib/api/oracleHandlers');
    const response = await handleGetHistoricalPrices(
      {
        provider: args.provider as OracleProvider,
        symbol: args.symbol,
        chain: args.chain as Blockchain | undefined,
        period: args.period,
        forceRefresh: args.forceRefresh,
      },
      `mcp_${Date.now()}`
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to fetch price history');
    }

    return formatAsText(data.data);
  },
};
