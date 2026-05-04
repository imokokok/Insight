import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { sanitizeString } from '@/lib/security';
import { getServerQueries } from '@/lib/supabase/server';

const MAX_NAME_LENGTH = 100;
const MAX_PRICE_DATA_SIZE = 50000;

function validateCreateSnapshot(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const rawBody = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (rawBody.name !== undefined) {
    if (typeof rawBody.name === 'string') {
      data.name = sanitizeString(rawBody.name, { maxLength: MAX_NAME_LENGTH });
    } else if (rawBody.name !== null) {
      return null;
    }
  }

  if (typeof rawBody.symbol !== 'string' || rawBody.symbol.length === 0) {
    return null;
  }
  data.symbol = sanitizeString(rawBody.symbol, { maxLength: 20, uppercase: true });

  if (!Array.isArray(rawBody.selected_oracles) || rawBody.selected_oracles.length === 0) {
    return null;
  }
  const validOracles = (rawBody.selected_oracles as unknown[]).filter(
    (o): o is string => typeof o === 'string' && o.length > 0 && o.length <= 50
  );
  if (validOracles.length === 0) {
    return null;
  }
  data.selected_oracles = validOracles;

  if (!Array.isArray(rawBody.price_data) || rawBody.price_data.length === 0) {
    return null;
  }

  for (const item of rawBody.price_data) {
    if (!item || typeof item !== 'object') return null;
    if (typeof item.symbol !== 'string' || item.symbol.trim() === '') return null;
    if (typeof item.price !== 'number' || !isFinite(item.price)) return null;
  }

  const priceDataStr = JSON.stringify(rawBody.price_data);
  if (priceDataStr.length > MAX_PRICE_DATA_SIZE) {
    return null;
  }
  data.price_data = rawBody.price_data;

  if (!rawBody.stats || typeof rawBody.stats !== 'object') {
    return null;
  }
  const statsObj = rawBody.stats as Record<string, unknown>;
  const requiredStatFields = [
    'avgPrice',
    'weightedAvgPrice',
    'maxPrice',
    'minPrice',
    'priceRange',
    'variance',
    'standardDeviation',
    'standardDeviationPercent',
  ];
  const hasAllStatFields = requiredStatFields.every(
    (field) => typeof statsObj[field] === 'number' && isFinite(statsObj[field] as number)
  );
  if (!hasAllStatFields) {
    return null;
  }
  data.stats = rawBody.stats;

  if (rawBody.is_public !== undefined) {
    if (typeof rawBody.is_public === 'boolean') {
      data.is_public = rawBody.is_public;
    } else {
      return null;
    }
  }

  return data;
}

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const queries = getServerQueries();
    const snapshots = await queries.getSnapshots(userId);

    if (!snapshots) {
      return ApiResponseBuilder.serverError('Failed to fetch snapshots');
    }

    return NextResponse.json({
      snapshots,
      count: snapshots.length,
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: true },
    },
  }
);

export const POST = createApiHandler(
  async (request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return ApiResponseBuilder.badRequest('Invalid JSON in request body');
    }

    const validatedData = validateCreateSnapshot(body);

    if (!validatedData) {
      return ApiResponseBuilder.badRequest(
        'Invalid request data. Check symbol, selected_oracles, price_data, and stats fields.'
      );
    }

    const queries = getServerQueries();
    const snapshot = await queries.saveSnapshot(
      userId,
      validatedData as Parameters<typeof queries.saveSnapshot>[1]
    );

    if (!snapshot) {
      return ApiResponseBuilder.serverError('Failed to create snapshot');
    }

    return NextResponse.json(
      {
        snapshot,
        message: 'Snapshot created successfully',
      },
      { status: 201 }
    );
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: true },
    },
  }
);
