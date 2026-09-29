import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { BatchPriceRequestSchema, fetchBatchPrices } from '@/lib/api/services/batchPriceService';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('batch-oracle-price');

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

    const data = await fetchBatchPrices(validation.data, {
      signal: request.signal,
      onQueryError: (query, message) => {
        logger.error(
          `Batch query failed for ${query.provider}/${query.symbol}/${query.chain}: ${message}`
        );
      },
    });

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
