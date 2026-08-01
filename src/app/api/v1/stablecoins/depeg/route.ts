import { type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { STABLECOINS } from '@/lib/stablecoins/config';
import type { StablecoinSymbol } from '@/lib/stablecoins/config';
import {
  calculateAllStablecoinSnapshots,
  calculateStablecoinDepegSnapshot,
} from '@/lib/stablecoins/monitor';

const STABLECOIN_SYMBOLS = STABLECOINS.map((c) => c.symbol) as [string, ...string[]];

const StablecoinQuerySchema = z.object({
  symbol: z
    .string()
    .refine(
      (val) => STABLECOIN_SYMBOLS.includes(val),
      `Invalid stablecoin symbol. Supported: ${STABLECOIN_SYMBOLS.join(', ')}`
    )
    .optional(),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const symbol = context.validated!.query!.symbol;

    let data;
    if (symbol) {
      data = await calculateStablecoinDepegSnapshot(symbol as StablecoinSymbol);
    } else {
      data = await calculateAllStablecoinSnapshots();
    }

    return createCachedJsonResponse(
      ApiResponseBuilder.success(data, { requestId: context.requestId }),
      { preset: 'realtime' }
    );
  },
  {
    // Tier 2 deep-analysis endpoint
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: StablecoinQuerySchema },
  }
);
