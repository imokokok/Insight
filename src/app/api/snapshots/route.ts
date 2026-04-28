import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { sanitizeObject, sanitizeString } from '@/lib/security';
import { getServerQueries } from '@/lib/supabase/server';

const MAX_NAME_LENGTH = 100;
const MAX_PRICE_DATA_SIZE = 50000;

function validateCreateSnapshot(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const sanitizedBody = sanitizeObject(body as Record<string, unknown>);
  const data: Record<string, unknown> = {};

  if (sanitizedBody.name !== undefined) {
    if (typeof sanitizedBody.name === 'string') {
      data.name = sanitizeString(sanitizedBody.name, { maxLength: MAX_NAME_LENGTH });
    } else if (sanitizedBody.name !== null) {
      return null;
    }
  }

  if (typeof sanitizedBody.symbol !== 'string' || sanitizedBody.symbol.length === 0) {
    return null;
  }
  data.symbol = sanitizeString(sanitizedBody.symbol, { maxLength: 20, uppercase: true });

  if (
    !Array.isArray(sanitizedBody.selected_oracles) ||
    sanitizedBody.selected_oracles.length === 0
  ) {
    return null;
  }
  const validOracles = (sanitizedBody.selected_oracles as unknown[]).filter(
    (o): o is string => typeof o === 'string' && o.length > 0 && o.length <= 50
  );
  if (validOracles.length === 0) {
    return null;
  }
  data.selected_oracles = validOracles;

  if (!Array.isArray(sanitizedBody.price_data) || sanitizedBody.price_data.length === 0) {
    return null;
  }
  const priceDataStr = JSON.stringify(sanitizedBody.price_data);
  if (priceDataStr.length > MAX_PRICE_DATA_SIZE) {
    return null;
  }
  data.price_data = sanitizedBody.price_data;

  if (!sanitizedBody.stats || typeof sanitizedBody.stats !== 'object') {
    return null;
  }
  const statsObj = sanitizedBody.stats as Record<string, unknown>;
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
  data.stats = sanitizedBody.stats;

  if (sanitizedBody.is_public !== undefined) {
    if (typeof sanitizedBody.is_public === 'boolean') {
      data.is_public = sanitizedBody.is_public;
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
