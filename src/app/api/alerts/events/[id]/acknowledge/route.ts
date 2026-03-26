import { type NextRequest, NextResponse } from 'next/server';

import { getUserId } from '@/lib/api/utils';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-alerts-events-acknowledge');

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queries = getServerQueries();
    const events = await queries.getAlertEvents(userId);

    if (!events) {
      return NextResponse.json({ error: 'Failed to verify event ownership' }, { status: 500 });
    }

    const event = events.find((e) => e.id === id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.acknowledged) {
      return NextResponse.json({
        message: 'Event already acknowledged',
        event,
      });
    }

    const acknowledgedEvent = await queries.acknowledgeAlertEvent(id);

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
