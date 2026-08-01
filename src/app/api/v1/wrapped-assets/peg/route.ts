import { type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { WRAPPED_ASSETS } from '@/lib/wrapped-assets/config';
import {
  calculateAllWrappedAssetSnapshots,
  calculateWrappedAssetSnapshot,
} from '@/lib/wrapped-assets/monitor';

const WRAPPED_ASSET_SYMBOLS = WRAPPED_ASSETS.map((a) => a.symbol) as [string, ...string[]];

const WrappedAssetQuerySchema = z.object({
  symbol: z
    .string()
    .refine(
      (val) => WRAPPED_ASSET_SYMBOLS.includes(val),
      `Invalid wrapped asset symbol. Supported: ${WRAPPED_ASSET_SYMBOLS.join(', ')}`
    )
    .optional(),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const symbol = context.validated!.query!.symbol;

    let data;
    if (symbol) {
      data = await calculateWrappedAssetSnapshot(symbol);
    } else {
      data = await calculateAllWrappedAssetSnapshots();
    }

    return createCachedJsonResponse(
      ApiResponseBuilder.success(data, { requestId: context.requestId }),
      { preset: 'realtime' }
    );
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: WrappedAssetQuerySchema },
  }
);
