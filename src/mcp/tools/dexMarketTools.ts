import { getMonadUniswapV3MarketSnapshot } from '@/lib/dex/monadUniswapV3';
import { getMonadUniswapV3VolumeSummary } from '@/lib/dex/monadUniswapV3Volume';

import { formatAsText } from './formatters';
import { MonadDexMarketInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

/**
 * Returns execution-market evidence for the reviewed Monad WMON/USDC pool.
 * This must remain a separate MCP tool rather than an input to the oracle
 * catalog: one DEX venue is valuable route context, not an independent oracle
 * vote or a venue-independent fair-price claim.
 */
export const getMonadDexMarketTool: McpToolDefinition<typeof MonadDexMarketInputSchema> = {
  name: 'get_monad_dex_market',
  description:
    'Get fresh, block-pinned Monad Uniswap V3 WMON/USDC market evidence: spot, 15-minute TWAP, active liquidity, executable quote ladder, and finalized rolling volume. This is a single-venue DEX market source, not an oracle-consensus price.',
  parameters: MonadDexMarketInputSchema,
  handler: async () => {
    const snapshot = await getMonadUniswapV3MarketSnapshot();
    const volume = await getMonadUniswapV3VolumeSummary(snapshot.block.timestamp);

    return formatAsText({
      ...snapshot,
      volume,
      caveats: [
        'DEX market evidence is not an oracle-consensus vote or a venue-independent fair price.',
        'activeLiquidityRaw is Uniswap V3 in-range liquidity; it is not token reserve TVL.',
        'Rolling volume is null while the finalized Swap-event index is warming or unavailable; null never means zero.',
      ],
    });
  },
};
