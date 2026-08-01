import type { StablecoinSymbol } from '@/lib/stablecoins/config';
import {
  calculateAllStablecoinSnapshots,
  calculateStablecoinDepegSnapshot,
  type StablecoinDepegSnapshot,
} from '@/lib/stablecoins/monitor';

import { formatPercent, formatPrice } from './formatters';
import { StablecoinInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

export const getStablecoinPegTool: McpToolDefinition<typeof StablecoinInputSchema> = {
  name: 'get_stablecoin_peg',
  description:
    'Check stablecoin peg status. Provide a symbol for a specific stablecoin, or omit it to get all tracked stablecoins.',
  parameters: StablecoinInputSchema,
  handler: async (args) => {
    if (args.symbol) {
      let snapshot: StablecoinDepegSnapshot;
      try {
        snapshot = await calculateStablecoinDepegSnapshot(args.symbol as StablecoinSymbol);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // No active oracle feeds yet (e.g. a niche stablecoin pending feed
        // sync). Surface this as an informational result rather than a hard
        // error so the MCP call still succeeds with a useful explanation.
        if (/^No valid price sources for /.test(message)) {
          return [
            `**Stablecoin peg: ${args.symbol}**`,
            `- Status: unavailable`,
            `- Reason: no active oracle feeds for ${args.symbol} yet. The feed is configured but has not been synced into the active feeds table. It will become available after the next oracle feed sync run.`,
          ].join('\n');
        }
        throw error;
      }

      const lines = [
        `**Stablecoin peg: ${snapshot.symbol} (${snapshot.displayName})**`,
        `- Target peg: $${formatPrice(snapshot.targetPeg)}`,
        `- Oracle reference price: $${formatPrice(snapshot.referencePrice)}`,
        `- Market reference price: $${formatPrice(snapshot.marketReferencePrice)}`,
        `- Oracle-market divergence: ${formatPercent(snapshot.oracleMarketDivergencePercent)}`,
        `- Direction: ${snapshot.oracleMarketDirection}`,
        `- Risk level: ${snapshot.riskLevel}`,
        `- Reason: ${snapshot.riskReason}`,
        `- Duration: ${snapshot.durationSeconds}s`,
      ];

      if (snapshot.sources && snapshot.sources.length > 0) {
        lines.push('', '**Oracle sources:**');
        for (const source of snapshot.sources) {
          const sourceName = `${source.provider.toUpperCase()} @ ${source.chain}`;
          lines.push(
            `- ${sourceName}: $${formatPrice(source.price)}${source.deviationPercent !== undefined ? ` (${formatPercent(source.deviationPercent)})` : ''}`
          );
        }
      }

      return lines.join('\n');
    }

    const snapshots = await calculateAllStablecoinSnapshots();

    const lines = ['**Stablecoin peg tracker**', ''];

    for (const snapshot of snapshots) {
      lines.push(
        `- ${snapshot.symbol} (${snapshot.displayName}): oracle $${formatPrice(snapshot.referencePrice)} / market $${formatPrice(snapshot.marketReferencePrice)} → divergence ${formatPercent(snapshot.oracleMarketDivergencePercent)} → ${snapshot.riskLevel}`
      );
    }

    return lines.join('\n');
  },
};
