import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { requireAuth, AUTH_MODERATE_MIDDLEWARE } from '@/lib/api/utils';
import { CreateAlertRequestSchema, AlertListResponseSchema } from '@/lib/security/validation';
import { type AlertConditionType } from '@/lib/supabase/database.types';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { validateBodySchema } from '@/lib/validation';

const logger = createLogger('api-alerts');

export const GET = createApiHandler(async (_request: NextRequest, context) => {
  const authResult = requireAuth(context);
  if (typeof authResult !== 'string') return authResult;
  const userId = authResult;

  const queries = getServerQueries();
  const alerts = await queries.getAlerts(userId);

  if (!alerts) {
    return ApiResponseBuilder.serverError('Failed to fetch alerts');
  }

  const response = {
    alerts,
    count: alerts.length,
  };

  const validatedResponse = AlertListResponseSchema.safeParse(response);
  if (!validatedResponse.success) {
    logger.error('Alert response validation failed', validatedResponse.error);
    return ApiResponseBuilder.serverError('Invalid response format');
  }

  return NextResponse.json(validatedResponse.data);
}, AUTH_MODERATE_MIDDLEWARE);

export const POST = createApiHandler(async (request: NextRequest, context) => {
  const authResult = requireAuth(context);
  if (typeof authResult !== 'string') return authResult;
  const userId = authResult;

  const validation = await validateBodySchema(CreateAlertRequestSchema)(request);

  if (!validation.success) {
    return validation.response ?? ApiResponseBuilder.badRequest('Validation failed');
  }

  const { name, symbol, chain, condition_type, target_value, provider, is_active } = validation
    .data!.body! as {
    name: string;
    symbol: string;
    chain?: string;
    condition_type: AlertConditionType;
    target_value: number;
    provider?: string;
    is_active?: boolean;
  };

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
    return ApiResponseBuilder.serverError('Failed to create alert');
  }

  return NextResponse.json(
    {
      alert,
      message: 'Alert created successfully',
    },
    { status: 201 }
  );
}, AUTH_MODERATE_MIDDLEWARE);
