import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { getRobinhoodInstrumentAdmission } from '@/lib/rwa/instrumentRegistry';
import { RobinhoodRwaContextQuerySchema } from '@/lib/rwa/robinhoodSchema';

import type { z } from 'zod';

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { symbol, verifyOnchain } = context.validated!.query as z.infer<
      typeof RobinhoodRwaContextQuerySchema
    >;
    const admission = await getRobinhoodInstrumentAdmission(symbol, { verifyOnchain });
    return NextResponse.json(
      ApiResponseBuilder.success(admission, {
        requestId: context.requestId,
        meta: {
          evidenceClass: 'reference-master-data',
          countsTowardOracleQuorum: false,
          mayAuthorizeExecution: false,
        },
      })
    );
  },
  {
    middlewares: V1_READ_ONLY_MIDDLEWARES,
    validation: { query: RobinhoodRwaContextQuerySchema },
  }
);
