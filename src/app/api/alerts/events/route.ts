import { type NextRequest, NextResponse } from 'next/server';

import { moderateRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
import { ApiResponseBuilder } from '@/lib/api/response';
import { getUserId } from '@/lib/api/utils';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-alerts-events');

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const rateLimitResult = await moderateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const userId = await getUserId(request);
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
  } catch (error) {
    logger.error(
      'Error fetching alert events',
      error instanceof Error ? error : new Error(String(error))
    );
    return ApiResponseBuilder.serverError();
  }
}
