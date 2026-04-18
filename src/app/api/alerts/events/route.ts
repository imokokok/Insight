import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getServerQueries } from '@/lib/supabase/server';

const MAX_LIMIT = 100;

export const GET = createApiHandler(
  async (request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const acknowledgedParam = searchParams.get('acknowledged');
    const limitParam = searchParams.get('limit');

    let acknowledged: boolean | undefined;
    if (acknowledgedParam !== null) {
      if (acknowledgedParam === 'true') {
        acknowledged = true;
      } else if (acknowledgedParam === 'false') {
        acknowledged = false;
      }
    }

    let limit: number | undefined;
    if (limitParam !== null) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= MAX_LIMIT) {
        limit = parsedLimit;
      }
    }

    const queries = getServerQueries();
    let events = await queries.getAlertEvents(userId);

    if (!events) {
      return ApiResponseBuilder.serverError('Failed to fetch alert events');
    }

    if (acknowledged !== undefined) {
      events = events.filter((e) => e.acknowledged === acknowledged);
    }

    if (limit !== undefined) {
      events = events.slice(0, limit);
    }

    return NextResponse.json({
      events,
      count: events.length,
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: true },
    },
  }
);
