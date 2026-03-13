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
    const existingSnapshot = await queries.getSnapshotById(id);

    if (!existingSnapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    if (existingSnapshot.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const updatedSnapshot = await queries.updateSnapshot(id, { is_public: true });

    if (!updatedSnapshot) {
      return NextResponse.json(
        { error: 'Failed to share snapshot' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const shareUrl = `${baseUrl}/snapshots/${id}`;

    return NextResponse.json({
      message: 'Snapshot shared successfully',
      share_url: shareUrl,
      snapshot: updatedSnapshot,
    });
  } catch (error) {
    console.error('Error sharing snapshot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
