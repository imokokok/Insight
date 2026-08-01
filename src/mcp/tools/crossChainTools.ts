import { getCrossChainSpreads } from '@/lib/api/services/crossChainSpreadService';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

import { formatPercent, formatPrice } from './formatters';
import { CrossChainSpreadInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

export const getCrossChainSpreadsTool: McpToolDefinition<typeof CrossChainSpreadInputSchema> = {
  name: 'get_cross_chain_spreads',
  description:
    'Get pairwise price spreads across chains for a given provider and symbol. Useful for cross-chain arbitrage and risk tracking.',
  parameters: CrossChainSpreadInputSchema,
  handler: async (args) => {
    const result = await getCrossChainSpreads(
      args.provider as OracleProvider,
      args.symbol,
      args.baseChain as Blockchain | undefined
    );

    const { summary, priceDifferences } = result;

    const lines = [
      `**Cross-chain spreads for ${summary.symbol} (${summary.provider.toUpperCase()})**`,
      `- Base chain: ${summary.baseChain}`,
      `- Chains covered: ${summary.chainCount}`,
      `- Timestamp: ${new Date(Date.now()).toISOString()}`,
      '',
      '**Prices vs base chain:**',
    ];

    const sortedDifferences = [...priceDifferences].sort(
      (a, b) => Math.abs(b.diffPercent) - Math.abs(a.diffPercent)
    );

    for (const diff of sortedDifferences) {
      const sign = diff.diffPercent > 0 ? '+' : '';
      lines.push(
        `- ${diff.chain}: $${formatPrice(diff.price)} (${sign}${formatPercent(diff.diffPercent)} vs base)`
      );
    }

    lines.push('', `**Summary:** max spread ${formatPercent(summary.maxSpreadPercent)}`);

    return lines.join('\n');
  },
};
