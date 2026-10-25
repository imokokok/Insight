import { getBaseUniswapV3MarketSnapshot } from '@/lib/dex/baseUniswapV3';
import {
  getHyperliquidPerpMarketSnapshot,
  hyperliquidPerpMarketProfile,
} from '@/lib/dex/hyperliquidPerpMarket';
import { getMonadUniswapV3MarketSnapshot } from '@/lib/dex/monadUniswapV3';
import { getMonadUniswapV3VolumeSummary } from '@/lib/dex/monadUniswapV3Volume';
import { getSolanaJupiterRouteSnapshot } from '@/lib/dex/solanaJupiterRoute';

import { formatAsText } from './formatters';
import {
  BaseDexMarketInputSchema,
  HyperliquidPerpMarketInputSchema,
  MonadDexMarketInputSchema,
  SolanaDexRouteInputSchema,
} from './schemas';

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

/** Returns block-pinned Base evidence for the reviewed WETH/USDC pool. */
export const getBaseDexMarketTool: McpToolDefinition<typeof BaseDexMarketInputSchema> = {
  name: 'get_base_dex_market',
  description:
    'Get fresh, block-pinned Base Uniswap V3 WETH/USDC market evidence: spot, 30-minute TWAP, active liquidity, and executable quote ladder. This is one DEX venue, not an oracle-consensus price.',
  parameters: BaseDexMarketInputSchema,
  handler: async () => {
    const snapshot = await getBaseUniswapV3MarketSnapshot();
    return formatAsText({
      ...snapshot,
      caveats: [
        'DEX market evidence is not an oracle-consensus vote or a venue-independent fair price.',
        'activeLiquidityRaw is Uniswap V3 in-range liquidity; it is not token reserve TVL.',
        'This endpoint reports one reviewed WETH/USDC pool, not every Base route.',
      ],
    });
  },
};

/** Returns authenticated Jupiter route context for the reviewed SOL/USDC market. */
export const getSolanaDexRouteTool: McpToolDefinition<typeof SolanaDexRouteInputSchema> = {
  name: 'get_solana_dex_route',
  description:
    'Get fresh Jupiter SOL/USDC exact-input route evidence: quote ladder, price impact, selected AMM route, quote context slot, and finalized Solana RPC witness. It is a route quote, not a simulated or guaranteed swap.',
  parameters: SolanaDexRouteInputSchema,
  handler: async () => {
    const snapshot = await getSolanaJupiterRouteSnapshot();
    return formatAsText({
      ...snapshot,
      caveats: [
        'Jupiter route evidence is an aggregator quote, not a block-pinned read of one Solana pool.',
        'A quote is not a transaction simulation or a guarantee that a later signed swap will land.',
        'Use Insight’s signed Solana simulation receipt to bind an exact prepared transaction before authorization.',
      ],
    });
  },
};

/**
 * Hyperliquid is a CLOB perpetual venue, so Insight returns exchange context
 * and bounded estimates from the displayed L2 book rather than pretending an
 * AMM quote or a fair-price oracle exists.
 */
export const getHyperliquidPerpMarketTool: McpToolDefinition<
  typeof HyperliquidPerpMarketInputSchema
> = {
  name: 'get_hyperliquid_perp_market',
  description:
    'Get fresh Hyperliquid mainnet perpetual-market evidence for a reviewed BTC, ETH, or HYPE market: mark/oracle divergence, funding, open interest, 24-hour notional volume, L2 spread, displayed depth, and two-sided book-impact estimates. It is read-only CLOB context, not an oracle-consensus price or executable exchange quote.',
  parameters: HyperliquidPerpMarketInputSchema,
  handler: async ({ market }) => {
    const snapshot = await getHyperliquidPerpMarketSnapshot(hyperliquidPerpMarketProfile(market));
    return formatAsText({
      ...snapshot,
      caveats: [
        'Hyperliquid perpetual-market evidence is read-only CLOB context, not an oracle-consensus vote or venue-independent fair price.',
        'Book-impact estimates consume at most the published L2 levels and exclude fees, funding, margin, matching priority, and future book changes.',
        'Funding, open interest, mark, and oracle values are exchange-reported perpetual context, not independently verified on-chain data.',
      ],
    });
  },
};
