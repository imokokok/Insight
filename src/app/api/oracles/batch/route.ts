import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler } from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { SafeSymbolSchema, SafeProviderSchema, SafeChainSchema } from '@/lib/security/validation';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';
import { type Blockchain, type OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('batch-oracle-price');

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

export const POST = createApiHandler(
  async (request: NextRequest) => {
    let body: unknown;
    try {
      body = await request.clone().json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON in request body' } },
        { status: 400 }
      );
    }

    const validation = BatchPriceRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: { errors } },
        },
        { status: 400 }
      );
    }

    const { queries, forceRefresh } = validation.data;

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

    return createCachedJsonResponse(
      {
        success: !hasErrors,
        data,
      },
      { preset: 'realtime' }
    );
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: false },
    },
    skipInternalAuthAndRateLimit: true,
  }
);
