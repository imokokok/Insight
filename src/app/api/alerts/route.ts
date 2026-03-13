import { NextRequest, NextResponse } from 'next/server';
import { getServerQueries } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { AlertConditionType } from '@/lib/supabase/database.types';

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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const queries = getServerQueries();
    const alerts = await queries.getAlerts(userId);

    if (!alerts) {
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: 'Failed to create alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      alert,
      message: 'Alert created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
