import { type NextRequest, NextResponse } from 'next/server';

import { getUserId } from '@/lib/api/utils';
import { sanitizeObject, sanitizeString, sanitizeSymbol, sanitizeUuid } from '@/lib/security';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-snapshots-id');

const MAX_NAME_LENGTH = 100;
const MAX_PRICE_DATA_SIZE = 50000;
const MAX_STATS_SIZE = 10000;
const MAX_ORACLES_COUNT = 10;

function validateSnapshotId(id: string): string | null {
  const sanitized = sanitizeUuid(id);
  return sanitized || null;
}

function validateSnapshotUpdate(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const sanitizedBody = sanitizeObject(body as Record<string, unknown>);
  const updateData: Record<string, unknown> = {};

  if (sanitizedBody.name !== undefined) {
    if (typeof sanitizedBody.name === 'string') {
      updateData.name = sanitizeString(sanitizedBody.name, { maxLength: MAX_NAME_LENGTH });
    } else {
      return null;
    }
  }

  if (sanitizedBody.symbol !== undefined) {
    if (typeof sanitizedBody.symbol === 'string') {
      updateData.symbol = sanitizeSymbol(sanitizedBody.symbol);
    } else {
      return null;
    }
  }

  if (sanitizedBody.selected_oracles !== undefined) {
    if (Array.isArray(sanitizedBody.selected_oracles)) {
      if (sanitizedBody.selected_oracles.length > MAX_ORACLES_COUNT) {
        return null;
      }
      updateData.selected_oracles = sanitizedBody.selected_oracles.filter(
        (o): o is string => typeof o === 'string'
      );
    } else {
      return null;
    }
  }

  if (sanitizedBody.price_data !== undefined) {
    if (typeof sanitizedBody.price_data === 'object') {
      const priceDataStr = JSON.stringify(sanitizedBody.price_data);
      if (priceDataStr.length > MAX_PRICE_DATA_SIZE) {
        return null;
      }
      updateData.price_data = sanitizedBody.price_data;
    } else {
      return null;
    }
  }

  if (sanitizedBody.stats !== undefined) {
    if (typeof sanitizedBody.stats === 'object') {
      const statsStr = JSON.stringify(sanitizedBody.stats);
      if (statsStr.length > MAX_STATS_SIZE) {
        return null;
      }
      updateData.stats = sanitizedBody.stats;
    } else {
      return null;
    }
  }

  if (sanitizedBody.is_public !== undefined) {
    if (typeof sanitizedBody.is_public === 'boolean') {
      updateData.is_public = sanitizedBody.is_public;
    } else {
      return null;
    }
  }

  return updateData;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const validatedId = validateSnapshotId(id);

    if (!validatedId) {
      return NextResponse.json({ error: 'Invalid snapshot ID' }, { status: 400 });
    }

    const userId = await getUserId(request);

    const queries = getServerQueries();
    const snapshot = await queries.getSnapshotById(validatedId);

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
    const validatedId = validateSnapshotId(id);

    if (!validatedId) {
      return NextResponse.json({ error: 'Invalid snapshot ID' }, { status: 400 });
    }

    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queries = getServerQueries();
    const existingSnapshot = await queries.getSnapshotById(validatedId);

    if (!existingSnapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    if (existingSnapshot.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updateData = validateSnapshotUpdate(body);

    if (!updateData || Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatedSnapshot = await queries.updateSnapshot(validatedId, updateData);

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
    const validatedId = validateSnapshotId(id);

    if (!validatedId) {
      return NextResponse.json({ error: 'Invalid snapshot ID' }, { status: 400 });
    }

    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queries = getServerQueries();
    const existingSnapshot = await queries.getSnapshotById(validatedId);

    if (!existingSnapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    if (existingSnapshot.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await queries.deleteSnapshot(validatedId);

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
