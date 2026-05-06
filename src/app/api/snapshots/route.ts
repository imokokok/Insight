import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getServerQueries } from '@/lib/supabase/server';

const PriceDataItemSchema = z.object({
  symbol: z.string().min(1),
  price: z.number().finite(),
});

const StatsSchema = z.object({
  avgPrice: z.number().finite(),
  weightedAvgPrice: z.number().finite(),
  maxPrice: z.number().finite(),
  minPrice: z.number().finite(),
  priceRange: z.number().finite(),
  variance: z.number().finite(),
  standardDeviation: z.number().finite(),
  standardDeviationPercent: z.number().finite(),
});

const CreateSnapshotSchema = z
  .object({
    name: z.string().max(100).optional().nullable(),
    symbol: z
      .string()
      .min(1)
      .max(20)
      .transform((s) => s.toUpperCase()),
    selected_oracles: z.array(z.string().min(1).max(50)).min(1),
    price_data: z.array(PriceDataItemSchema).min(1),
    stats: StatsSchema,
    is_public: z.boolean().optional(),
  })
  .refine((data) => JSON.stringify(data.price_data).length <= 50000, {
    message: 'price_data exceeds maximum size',
    path: ['price_data'],
  });

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

    const result = CreateSnapshotSchema.safeParse(body);

    if (!result.success) {
      return ApiResponseBuilder.badRequest(
        'Invalid request data. Check symbol, selected_oracles, price_data, and stats fields.'
      );
    }

    const queries = getServerQueries();
    const snapshot = await queries.saveSnapshot(
      userId,
      result.data as Parameters<typeof queries.saveSnapshot>[1]
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
