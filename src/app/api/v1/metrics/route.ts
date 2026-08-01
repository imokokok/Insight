import { type NextRequest } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { reputationService } from '@/lib/oracles/services/reputationService';
import { getAllActiveFeedsByProvider } from '@/lib/oracles/utils/dynamicFeedResolver';
import { OracleProvider } from '@/types/oracle';

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const feedsByProvider = await getAllActiveFeedsByProvider();
    const allFeeds = Array.from(feedsByProvider.values()).flat();

    const activeFeeds = allFeeds.length;
    const symbols = new Set(allFeeds.map((f) => f.symbol)).size;
    const chains = new Set(allFeeds.map((f) => f.chain_id)).size;
    const categories = new Set(allFeeds.map((f) => f.category)).size;

    const reputations = await reputationService.getReputations();

    const payload = {
      providers: Object.values(OracleProvider).length,
      activeFeeds,
      symbols,
      chains,
      categories,
      topProviders: reputations.slice(0, 5).map((r) => ({
        provider: r.provider,
        score: r.overall_score,
      })),
    };

    return createCachedJsonResponse(
      ApiResponseBuilder.success(payload, { requestId: context.requestId }),
      { preset: 'shortLived' }
    );
  },
  {
    middlewares: V1_READ_ONLY_MIDDLEWARES,
  }
);
