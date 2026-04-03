import { type NextRequest, NextResponse } from 'next/server';

import { getUserId } from '@/lib/api/utils';
import { sanitizeObject } from '@/lib/security';
import { CreateSnapshotRequestSchema, validateAndSanitize } from '@/lib/security/validation';
import { type UserSnapshotInsert } from '@/lib/supabase/queries';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider } from '@/types/oracle';

const logger = createLogger('api-snapshots');

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queries = getServerQueries();
    const snapshots = await queries.getSnapshots(userId);

    if (!snapshots) {
      return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 });
    }

    return NextResponse.json({
      snapshots,
      count: snapshots.length,
    });
  } catch (error) {
    logger.error(
      'Error fetching snapshots',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const validatedData = validateAndSanitize(CreateSnapshotRequestSchema, body);

    if (!validatedData) {
      return NextResponse.json(
        {
          error:
            'Invalid request data. Check symbol, selected_oracles, price_data, and stats fields.',
        },
        { status: 400 }
      );
    }

    const sanitizedData = sanitizeObject(validatedData);
    const { name, symbol, selected_oracles, price_data, stats, is_public } = sanitizedData;

    const queries = getServerQueries();
    const snapshot = await queries.saveSnapshot(userId, {
      name,
      symbol,
      selected_oracles: selected_oracles as OracleProvider[],
      price_data: price_data as unknown as UserSnapshotInsert['price_data'],
      stats: stats as UserSnapshotInsert['stats'],
      is_public: is_public ?? false,
    });

    if (!snapshot) {
      return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 });
    }

    return NextResponse.json(
      {
        snapshot,
        message: 'Snapshot created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      'Error creating snapshot',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
