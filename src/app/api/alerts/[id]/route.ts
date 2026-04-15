import { type NextRequest, NextResponse } from 'next/server';

import { moderateRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
import { getUserId } from '@/lib/api/utils';
import { sanitizeObject, sanitizeString, sanitizeUuid } from '@/lib/security';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-alerts-id');

const VALID_CONDITION_TYPES = ['above', 'below', 'change_percent'] as const;
const MAX_NAME_LENGTH = 100;
const MAX_SYMBOL_LENGTH = 20;

function validateAlertId(id: string): string | null {
  return sanitizeUuid(id) || null;
}

function validateAlertUpdate(body: unknown): Record<string, unknown> | null {
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
      updateData.symbol = sanitizeString(sanitizedBody.symbol, {
        maxLength: MAX_SYMBOL_LENGTH,
        uppercase: true,
      });
    } else {
      return null;
    }
  }

  if (sanitizedBody.chain !== undefined) {
    if (typeof sanitizedBody.chain === 'string' || sanitizedBody.chain === null) {
      updateData.chain = sanitizedBody.chain;
    } else {
      return null;
    }
  }

  if (sanitizedBody.condition_type !== undefined) {
    if (
      typeof sanitizedBody.condition_type === 'string' &&
      VALID_CONDITION_TYPES.includes(
        sanitizedBody.condition_type as (typeof VALID_CONDITION_TYPES)[number]
      )
    ) {
      updateData.condition_type = sanitizedBody.condition_type;
    } else {
      return null;
    }
  }

  if (sanitizedBody.target_value !== undefined) {
    if (
      typeof sanitizedBody.target_value === 'number' &&
      Number.isFinite(sanitizedBody.target_value)
    ) {
      updateData.target_value = sanitizedBody.target_value;
    } else {
      return null;
    }
  }

  if (sanitizedBody.provider !== undefined) {
    if (typeof sanitizedBody.provider === 'string' || sanitizedBody.provider === null) {
      updateData.provider = sanitizedBody.provider;
    } else {
      return null;
    }
  }

  if (sanitizedBody.is_active !== undefined) {
    if (typeof sanitizedBody.is_active === 'boolean') {
      updateData.is_active = sanitizedBody.is_active;
    } else {
      return null;
    }
  }

  return updateData;
}

async function getAlertById(id: string, userId: string) {
  const queries = getServerQueries();
  return queries.getAlertById(id, userId);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResult = await moderateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const { id } = await params;
    const validatedId = validateAlertId(id);

    if (!validatedId) {
      return NextResponse.json({ error: 'Invalid alert ID' }, { status: 400 });
    }

    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alert = await getAlertById(validatedId, userId);

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
  const rateLimitResult = await moderateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const { id } = await params;
    const validatedId = validateAlertId(id);

    if (!validatedId) {
      return NextResponse.json({ error: 'Invalid alert ID' }, { status: 400 });
    }

    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingAlert = await getAlertById(validatedId, userId);

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updateData = validateAlertUpdate(body);

    if (!updateData || Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const queries = getServerQueries();
    const updatedAlert = await queries.updateAlert(validatedId, updateData);

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
  const rateLimitResult = await moderateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const { id } = await params;
    const validatedId = validateAlertId(id);

    if (!validatedId) {
      return NextResponse.json({ error: 'Invalid alert ID' }, { status: 400 });
    }

    const userId = await getUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingAlert = await getAlertById(validatedId, userId);

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const queries = getServerQueries();
    const success = await queries.deleteAlert(validatedId);

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
