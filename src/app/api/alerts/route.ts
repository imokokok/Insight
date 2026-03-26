import { type NextRequest, NextResponse } from 'next/server';

import { getUserId } from '@/lib/api/utils';
import { type AlertConditionType } from '@/lib/supabase/database.types';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-alerts');

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queries = getServerQueries();
    const alerts = await queries.getAlerts(userId);

    if (!alerts) {
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    return NextResponse.json({
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    logger.error(
      'Error fetching alerts',
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
    const { name, symbol, chain, condition_type, target_value, provider, is_active } = body;

    if (!name || !symbol || !condition_type || target_value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, symbol, condition_type, target_value' },
        { status: 400 }
      );
    }

    const validConditionTypes: AlertConditionType[] = ['above', 'below', 'change_percent'];
    if (!validConditionTypes.includes(condition_type)) {
      return NextResponse.json(
        { error: `Invalid condition_type. Must be one of: ${validConditionTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const queries = getServerQueries();
    const alert = await queries.createAlert(userId, {
      name,
      symbol,
      chain: chain || null,
      condition_type,
      target_value,
      provider: provider || null,
      is_active: is_active ?? true,
    });

    if (!alert) {
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }

    return NextResponse.json(
      {
        alert,
        message: 'Alert created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating alert', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
