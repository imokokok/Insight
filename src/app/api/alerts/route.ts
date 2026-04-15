import { type NextRequest, NextResponse } from 'next/server';

import { moderateRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
import { ApiResponseBuilder } from '@/lib/api/response';
import { getUserId } from '@/lib/api/utils';
import { sanitizeObject } from '@/lib/security';
import { CreateAlertRequestSchema, AlertListResponseSchema } from '@/lib/security/validation';
import { type AlertConditionType } from '@/lib/supabase/database.types';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { validateBodySchema } from '@/lib/validation';

const logger = createLogger('api-alerts');

export async function GET(request: NextRequest) {
  const rateLimitResult = await moderateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const userId = await getUserId(request);
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

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
  } catch (error) {
    logger.error(
      'Error fetching alerts',
      error instanceof Error ? error : new Error(String(error))
    );
    return ApiResponseBuilder.serverError();
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await moderateRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const userId = await getUserId(request);
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const validation = await validateBodySchema(CreateAlertRequestSchema)(request);

    if (!validation.success) {
      return validation.response;
    }

    const sanitizedData = sanitizeObject(validation.data!.body!);

    const { name, symbol, chain, condition_type, target_value, provider, is_active } =
      sanitizedData as {
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
  } catch (error) {
    logger.error('Error creating alert', error instanceof Error ? error : new Error(String(error)));
    return ApiResponseBuilder.serverError();
  }
}
