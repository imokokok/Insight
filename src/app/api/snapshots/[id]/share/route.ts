import { NextRequest, NextResponse } from 'next/server';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { getUserId } from '@/lib/api/utils';

const logger = createLogger('api-snapshots-share');

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queries = getServerQueries();
    const existingSnapshot = await queries.getSnapshotById(id);

    if (!existingSnapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    if (existingSnapshot.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updatedSnapshot = await queries.updateSnapshot(id, { is_public: true });

    if (!updatedSnapshot) {
      return NextResponse.json({ error: 'Failed to share snapshot' }, { status: 500 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

    const shareUrl = `${baseUrl}/snapshots/${id}`;

    return NextResponse.json({
      message: 'Snapshot shared successfully',
      share_url: shareUrl,
      snapshot: updatedSnapshot,
    });
  } catch (error) {
    logger.error(
      'Error sharing snapshot',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
