/**
 * @fileoverview Single protocol risk parameters API
 * Returns liquidation threshold, LTV and collateral factor per asset
 * for a specific lending protocol.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  type ApiHandlerContext,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';
import { getProtocolRiskParamsById } from '@/lib/api/services/protocolRiskParamsApiService';
import { CACHE_PRESETS } from '@/lib/api/utils';

const ProtocolIdParamsSchema = z.object({
  id: z.string().min(1, 'Protocol ID is required'),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context: ApiHandlerContext) => {
    const paramsResult = ProtocolIdParamsSchema.safeParse(context.validated?.params ?? {});
    if (!paramsResult.success) {
      return NextResponse.json(
        ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid protocol ID', {
          retryable: false,
          details: {
            errors: paramsResult.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          },
        }),
        { status: 400 }
      );
    }

    const { id } = paramsResult.data;

    const result = await getProtocolRiskParamsById(id);

    if (!result) {
      return NextResponse.json(
        ApiResponseBuilder.error('PROTOCOL_NOT_FOUND', `Protocol '${id}' not found.`, {
          retryable: false,
          details: {
            protocolId: id,
          },
        }),
        { status: 404 }
      );
    }

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
