import { NextRequest, NextResponse } from 'next/server';
import { getServerQueries } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-alerts-id');

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

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user.id;
}

async function getAlertById(id: string, userId: string) {
  const queries = getServerQueries();
  const alerts = await queries.getAlerts(userId);
  if (!alerts) return null;
  return alerts.find((a) => a.id === id) || null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alert = await getAlertById(id, userId);

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({ alert });
  } catch (error) {
    logger.error('Error fetching alert', error instanceof Error ? error : new Error(String(error)));
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

    const existingAlert = await getAlertById(id, userId);

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, symbol, chain, condition_type, target_value, provider, is_active } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (symbol !== undefined) updateData.symbol = symbol;
    if (chain !== undefined) updateData.chain = chain;
    if (condition_type !== undefined) updateData.condition_type = condition_type;
    if (target_value !== undefined) updateData.target_value = target_value;
    if (provider !== undefined) updateData.provider = provider;
    if (is_active !== undefined) updateData.is_active = is_active;

    const queries = getServerQueries();
    const updatedAlert = await queries.updateAlert(id, updateData);

    if (!updatedAlert) {
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }

    return NextResponse.json({
      alert: updatedAlert,
      message: 'Alert updated successfully',
    });
  } catch (error) {
    logger.error('Error updating alert', error instanceof Error ? error : new Error(String(error)));
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

    const existingAlert = await getAlertById(id, userId);

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const queries = getServerQueries();
    const success = await queries.deleteAlert(id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting alert', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
