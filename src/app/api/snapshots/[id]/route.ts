import { NextRequest, NextResponse } from 'next/server';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { getUserId } from '@/lib/api/utils';

const logger = createLogger('api-snapshots-id');

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getUserId(request);

    const queries = getServerQueries();
    const snapshot = await queries.getSnapshotById(id);

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    if (snapshot.user_id !== userId && !snapshot.is_public) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    logger.error(
      'Error fetching snapshot',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await request.json();
    const { name, symbol, selected_oracles, price_data, stats, is_public } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (symbol !== undefined) updateData.symbol = symbol;
    if (selected_oracles !== undefined) updateData.selected_oracles = selected_oracles;
    if (price_data !== undefined) updateData.price_data = price_data;
    if (stats !== undefined) updateData.stats = stats;
    if (is_public !== undefined) updateData.is_public = is_public;

    const updatedSnapshot = await queries.updateSnapshot(id, updateData);

    if (!updatedSnapshot) {
      return NextResponse.json({ error: 'Failed to update snapshot' }, { status: 500 });
    }

    return NextResponse.json({
      snapshot: updatedSnapshot,
      message: 'Snapshot updated successfully',
    });
  } catch (error) {
    logger.error(
      'Error updating snapshot',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const success = await queries.deleteSnapshot(id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete snapshot' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Snapshot deleted successfully',
    });
  } catch (error) {
    logger.error(
      'Error deleting snapshot',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
