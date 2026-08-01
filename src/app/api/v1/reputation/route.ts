import { type NextRequest } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { reputationService } from '@/lib/oracles/services/reputationService';

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    let reputations = await reputationService.getReputations();

    if (reputations.length === 0) {
      await reputationService.seedInitialReputations();
      reputations = await reputationService.getReputations();
    }

    const data = {
      reputations,
      meta: {
        calculating: reputations.length === 0,
      },
    };

    return createCachedJsonResponse(
      ApiResponseBuilder.success(data, { requestId: context.requestId }),
      { preset: 'shortLived' }
    );
  },
  {
    middlewares: V1_READ_ONLY_MIDDLEWARES,
  }
);
