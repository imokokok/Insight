import { type NextRequest, NextResponse } from 'next/server';

import { strictRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
import { getUserId } from '@/lib/api/utils';
import { sanitizeUuid } from '@/lib/security';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-alerts-events-acknowledge');

function validateEventId(id: string): string | null {
  return sanitizeUuid(id) || null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResult = await strictRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const { id } = await params;
    const validatedId = validateEventId(id);

    if (!validatedId) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queries = getServerQueries();
    const event = await queries.getAlertEventById(validatedId, userId);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.acknowledged) {
      return NextResponse.json({
        message: 'Event already acknowledged',
        event,
      });
    }

    const acknowledgedEvent = await queries.acknowledgeAlertEvent(validatedId);

    if (!acknowledgedEvent) {
      return NextResponse.json({ error: 'Failed to acknowledge event' }, { status: 500 });
    }

    return NextResponse.json({
      event: acknowledgedEvent,
      message: 'Event acknowledged successfully',
    });
  } catch (error) {
    logger.error(
      'Error acknowledging event',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
