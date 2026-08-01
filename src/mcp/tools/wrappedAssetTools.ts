import {
  calculateAllWrappedAssetSnapshots,
  calculateWrappedAssetSnapshot,
} from '@/lib/wrapped-assets/monitor';

import { formatPercent, formatPrice } from './formatters';
import { WrappedAssetInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

export const getWrappedAssetPegTool: McpToolDefinition<typeof WrappedAssetInputSchema> = {
  name: 'get_wrapped_asset_peg',
  description:
    'Check wrapped asset (e.g. WBTC, wstETH) peg status. Provide a symbol for a specific asset, or omit it to get all tracked wrapped assets.',
  parameters: WrappedAssetInputSchema,
  handler: async (args) => {
    if (args.symbol) {
      const snapshot = await calculateWrappedAssetSnapshot(args.symbol);

      const lines = [
        `**Wrapped asset peg: ${snapshot.symbol} (${snapshot.displayName})**`,
        `- Type: ${snapshot.type}`,
        `- Underlying: ${snapshot.underlyingSymbol}`,
        `- Wrapped market price: $${formatPrice(snapshot.wrappedMarketPrice)}`,
        `- Underlying reference price: $${formatPrice(snapshot.underlyingReferencePrice)}`,
        `- Exchange rate: ${snapshot.exchangeRate.toFixed(6)}`,
        `- Fair underlying price: $${formatPrice(snapshot.fairUnderlyingPrice)}`,
        `- Deviation: ${formatPercent(snapshot.deviationPercent)}`,
        `- Risk level: ${snapshot.riskLevel}`,
        `- Duration: ${snapshot.durationSeconds}s`,
      ];

      if (snapshot.sources && snapshot.sources.length > 0) {
        lines.push('', '**Oracle sources:**');
        for (const source of snapshot.sources) {
          lines.push(
            `- ${source.provider.toUpperCase()} @ ${source.chain}: $${formatPrice(source.price)} (${formatPercent(source.deviationPercent)})`
          );
        }
      }

      return lines.join('\n');
    }

    const snapshots = await calculateAllWrappedAssetSnapshots();

    const lines = ['**Wrapped asset peg tracker**', ''];

    for (const snapshot of snapshots) {
      lines.push(
        `- ${snapshot.symbol}: fair underlying $${formatPrice(snapshot.fairUnderlyingPrice)} / deviation ${formatPercent(snapshot.deviationPercent)} → ${snapshot.riskLevel}`
      );
    }

    return lines.join('\n');
  },
};
