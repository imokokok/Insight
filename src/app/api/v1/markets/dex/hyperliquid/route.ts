import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import {
  getHyperliquidPerpMarketSnapshot,
  hyperliquidPerpMarketProfile,
  HYPERLIQUID_REVIEWED_PERP_MARKETS,
  type HyperliquidReviewedPerpMarket,
} from '@/lib/dex/hyperliquidPerpMarket';

export const OPTIONS = createOptionsHandler();

function requestedMarket(request: NextRequest): HyperliquidReviewedPerpMarket | null {
  const market = request.nextUrl.searchParams.get('market') ?? 'BTC';
  return HYPERLIQUID_REVIEWED_PERP_MARKETS.includes(market as HyperliquidReviewedPerpMarket)
    ? (market as HyperliquidReviewedPerpMarket)
    : null;
}

/**
 * Read-only Hyperliquid mainnet perpetual-market evidence. `market` is a
 * reviewed allowlist selector (BTC, ETH, or HYPE), never an arbitrary upstream
 * query parameter. No endpoint here signs, simulates, or submits an order.
 */
export const GET = createApiHandler(
  async (request: NextRequest, context) => {
    const market = requestedMarket(request);
    if (!market) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'INVALID_MARKET',
          'market must be one of the reviewed Hyperliquid perpetual markets: BTC, ETH, or HYPE.'
        ),
        { status: 400 }
      );
    }
    try {
      const snapshot = await getHyperliquidPerpMarketSnapshot(hyperliquidPerpMarketProfile(market));
      return createCachedJsonResponse(
        ApiResponseBuilder.success(
          {
            ...snapshot,
            caveats: [
              'Hyperliquid perpetual-market evidence is read-only CLOB context, not an oracle-consensus vote or venue-independent fair price.',
              'Book-impact estimates consume at most the published L2 levels and exclude fees, funding, margin, matching priority, and future book changes.',
              'Funding, open interest, mark, and oracle values are exchange-reported perpetual context, not independently verified on-chain data.',
            ],
          },
          { requestId: context.requestId }
        ),
        { preset: 'realtime' }
      );
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'HYPERLIQUID_MARKET_UNAVAILABLE',
          'Fresh Hyperliquid perpetual-market evidence is currently unavailable.'
        ),
        { status: 503 }
      );
    }
  },
  { middlewares: V1_READ_ONLY_MIDDLEWARES }
);
