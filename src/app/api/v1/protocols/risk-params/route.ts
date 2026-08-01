/**
 * @fileoverview Bulk protocol risk parameters API
 * Returns liquidation threshold, LTV and collateral factor per asset
 * for all integrated lending protocols.
 */

import { NextResponse, type NextRequest } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  type ApiHandlerContext,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';
import { getAllProtocolRiskParams } from '@/lib/api/services/protocolRiskParamsApiService';
import { CACHE_PRESETS } from '@/lib/api/utils';

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context: ApiHandlerContext) => {
    const result = await getAllProtocolRiskParams();

    const response = NextResponse.json(
      ApiResponseBuilder.success(result, {
        requestId: context.requestId,
      })
    );

    response.headers.set('Cache-Control', CACHE_PRESETS.semiStatic);

    return response;
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
  }
);
