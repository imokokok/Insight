import { NextRequest, NextResponse } from 'next/server';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { getUserId } from '@/lib/api/utils';

const logger = createLogger('api-alerts-events');

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const acknowledged = searchParams.get('acknowledged');
    const limit = searchParams.get('limit');

    const queries = getServerQueries();
    let events = await queries.getAlertEvents(userId);

    if (!events) {
      return NextResponse.json({ error: 'Failed to fetch alert events' }, { status: 500 });
    }

    if (acknowledged !== null) {
      const isAcknowledged = acknowledged === 'true';
      events = events.filter((e) => e.acknowledged === isAcknowledged);
    }

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        events = events.slice(0, limitNum);
      }
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
