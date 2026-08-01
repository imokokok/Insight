import { type NextRequest, NextResponse } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_READ_ONLY_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { getAllProtocolsWithDynamicData } from '@/lib/protocols/dynamicData';

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const allProtocols = await getAllProtocolsWithDynamicData();
    const lendingProtocols = allProtocols.filter((p) => p.protocolType === 'lending');

    if (lendingProtocols.length === 0) {
      return NextResponse.json(
        ApiResponseBuilder.error('NOT_FOUND', 'No lending protocols found', {
          requestId: context.requestId,
        }),
        { status: 404 }
      );
    }

    return createCachedJsonResponse(
      ApiResponseBuilder.success(lendingProtocols, { requestId: context.requestId }),
      { preset: 'semiStatic' }
    );
  },
  {
    middlewares: V1_READ_ONLY_MIDDLEWARES,
  }
);
