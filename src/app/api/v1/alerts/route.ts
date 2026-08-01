import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { SafeSymbolSchema, SafeProviderSchema, SafeChainSchema } from '@/lib/security/validation';
import { createServiceRoleClient, createUserClient } from '@/lib/supabase/server';

// ---------- GET: List user's alerts ----------

const ListAlertsQuerySchema = z.object({
  is_active: z.coerce.boolean().optional(),
  symbol: SafeSymbolSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ---------- POST: Create alert ----------

const CreateAlertSchema = z.object({
  name: z.string().max(100).optional(),
  symbol: SafeSymbolSchema,
  provider: SafeProviderSchema.optional(),
  chain: SafeChainSchema.optional(),
  conditionType: z.enum(['above', 'below', 'change_percent']),
  targetValue: z.number().positive(),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    if (!context.auth?.userId) {
      return NextResponse.json(
        ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required', {
          requestId: context.requestId,
        }),
        { status: 401 }
      );
    }

    const { is_active, symbol, limit, offset } = context.validated!.query!;

    const supabase = createUserClient(context.auth.accessToken);
    let query = supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', context.auth.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }
    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    const { data, error } = await query;

    if (error) {
      return ApiResponseBuilder.serverError('Failed to fetch alerts', context.requestId);
    }

    return NextResponse.json(
      ApiResponseBuilder.success(
        { alerts: data ?? [], count: data?.length ?? 0 },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true },
      rateLimit: { preset: 'api' },
      quota: true,
      cors: true,
    },
    validation: { query: ListAlertsQuerySchema },
  }
);

export const POST = createApiHandler(
  async (request: NextRequest, context) => {
    if (!context.auth?.userId) {
      return NextResponse.json(
        ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required', {
          requestId: context.requestId,
        }),
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.clone().json();
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error('BAD_REQUEST', 'Invalid JSON in request body', {
          requestId: context.requestId,
        }),
        { status: 400 }
      );
    }

    const validation = CreateAlertSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return NextResponse.json(
        ApiResponseBuilder.error('VALIDATION_ERROR', 'Validation failed', {
          requestId: context.requestId,
          details: { errors },
        }),
        { status: 400 }
      );
    }

    const { name, symbol, provider, chain, conditionType, targetValue } = validation.data;

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        user_id: context.auth.userId,
        name: name ?? null,
        symbol,
        provider: provider ?? null,
        chain: chain ?? null,
        condition_type: conditionType,
        target_value: targetValue,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return ApiResponseBuilder.serverError('Failed to create alert', context.requestId);
    }

    return NextResponse.json(ApiResponseBuilder.success(data, { requestId: context.requestId }), {
      status: 201,
    });
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true },
      rateLimit: { preset: 'api' },
      quota: true,
      cors: true,
    },
  }
);
