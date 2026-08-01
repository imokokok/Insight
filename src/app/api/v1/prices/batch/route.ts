import { type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  type ApiHandlerContext,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { SafeSymbolSchema, SafeProviderSchema, SafeChainSchema } from '@/lib/security/validation';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';
import { type Blockchain, type OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('v1-batch-prices');

// Bound concurrent upstream oracle fetches per batch request so a single
// 20-query batch does not fan out 20 simultaneous RPC/HTTP calls (which,
// compounded by parallel clients, can trip upstream rate limits).
const BATCH_FETCH_CONCURRENCY = 5;

const BatchPriceQuerySchema = z.object({
  provider: SafeProviderSchema,
  symbol: SafeSymbolSchema,
  chain: SafeChainSchema.optional(),
});

const BatchPriceRequestSchema = z.object({
  queries: z
    .array(BatchPriceQuerySchema)
    .min(1, 'At least one query is required')
    .max(20, 'Maximum 20 queries per batch request'),
  forceRefresh: z.boolean().optional().default(false),
});

interface BatchPriceResult {
  provider: string;
  symbol: string;
  chain?: string;
  price: PriceData | null;
  error: string | null;
}

type BatchPriceBody = z.infer<typeof BatchPriceRequestSchema>;

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler<
  BatchPriceResult[],
  BatchPriceBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context: ApiHandlerContext<BatchPriceBody>) => {
    const { queries, forceRefresh } = context.validated!.body!;

    const data: BatchPriceResult[] = await mapWithConcurrency(
      queries,
      BATCH_FETCH_CONCURRENCY,
      async (query): Promise<BatchPriceResult> => {
        try {
          const price = await fetchPriceWithDatabase(
            query.provider as OracleProvider,
            query.symbol,
            query.chain as Blockchain | undefined,
            true,
            forceRefresh
          );
          return {
            provider: query.provider,
            symbol: query.symbol,
            chain: query.chain,
            price,
            error: null,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          logger.error(
            `Batch query failed for ${query.provider}/${query.symbol}/${query.chain}: ${message}`
          );
          return {
            provider: query.provider,
            symbol: query.symbol,
            chain: query.chain,
            price: null,
            error: message,
          };
        }
      }
    );

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
    // Tier 2 deep-analysis endpoint
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { body: BatchPriceRequestSchema },
  }
);
