import { NextRequest, NextResponse } from 'next/server';
import { getServerQueries } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

async function getUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user.id;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const queries = getServerQueries();
    const events = await queries.getAlertEvents(userId);

    if (!events) {
      return NextResponse.json(
        { error: 'Failed to verify event ownership' },
        { status: 500 }
      );
    }

    const event = events.find(e => e.id === id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.acknowledged) {
      return NextResponse.json({
        message: 'Event already acknowledged',
        event,
      });
    }

    const acknowledgedEvent = await queries.acknowledgeAlertEvent(id);

    if (!acknowledgedEvent) {
      return NextResponse.json(
        { error: 'Failed to acknowledge event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      event: acknowledgedEvent,
      message: 'Event acknowledged successfully',
    });
  } catch (error) {
    console.error('Error acknowledging event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
