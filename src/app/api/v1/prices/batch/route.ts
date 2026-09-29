import { type NextRequest } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  type ApiHandlerContext,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import {
  BatchPriceRequestSchema,
  fetchBatchPrices,
  type BatchPriceBody,
  type BatchPriceResult,
} from '@/lib/api/services/batchPriceService';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('v1-batch-prices');

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler<
  BatchPriceResult[],
  BatchPriceBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context: ApiHandlerContext<BatchPriceBody>) => {
    const { queries } = context.validated!.body!;
    const data = await fetchBatchPrices(context.validated!.body!, {
      onQueryError: (query, message) => {
        logger.error(
          `Batch query failed for ${query.provider}/${query.symbol}/${query.chain}: ${message}`
        );
      },
    });

    const hasErrors = data.some((item) => item.error !== null);
    const partialErrors = hasErrors
      ? data
          .filter((item) => item.error !== null)
          .map((item) => ({
            provider: item.provider,
            symbol: item.symbol,
            chain: item.chain,
            error: item.error,
          }))
      : undefined;
    return createCachedJsonResponse(
      ApiResponseBuilder.success(data, {
        requestId: context.requestId,
        meta: {
          partialErrors,
          queryCount: queries.length,
        },
      }),
      { preset: 'realtime' }
    );
  },
  {
    // C2 deep-analysis endpoint (credit-metered)
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { body: BatchPriceRequestSchema },
  }
);
