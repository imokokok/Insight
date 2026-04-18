import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { sanitizeUuid } from '@/lib/security';
import { getServerQueries } from '@/lib/supabase/server';

function validateEventId(id: string): string | null {
  return sanitizeUuid(id) || null;
}

export const POST = createApiHandler(
  async (_request: NextRequest, context) => {
    const params = context.validated?.params as { id: string } | undefined;
    const id = params?.id;

    if (!id) {
      return ApiResponseBuilder.badRequest('Missing event ID');
    }

    const validatedId = validateEventId(id);

    if (!validatedId) {
      return ApiResponseBuilder.badRequest('Invalid event ID');
    }

    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const queries = getServerQueries();
    const event = await queries.getAlertEventById(validatedId, userId);

    if (!event) {
      return ApiResponseBuilder.notFound('Event not found');
    }

    if (event.acknowledged) {
      return NextResponse.json({
        message: 'Event already acknowledged',
        event,
      });
    }

    const acknowledgedEvent = await queries.acknowledgeAlertEvent(validatedId);

    if (!acknowledgedEvent) {
      return ApiResponseBuilder.serverError('Failed to acknowledge event');
    }

    return NextResponse.json({
      event: acknowledgedEvent,
      message: 'Event acknowledged successfully',
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'strict' },
      auth: { required: true },
    },
  }
);
