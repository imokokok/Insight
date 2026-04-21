import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { sanitizeObject, sanitizeString, sanitizeUuid } from '@/lib/security';
import { sanitizeChain, sanitizeProvider } from '@/lib/security/inputSanitizer';
import { getServerQueries } from '@/lib/supabase/server';

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
    if (sanitizedBody.chain === null) {
      updateData.chain = null;
    } else if (typeof sanitizedBody.chain === 'string') {
      const validatedChain = sanitizeChain(sanitizedBody.chain);
      if (!validatedChain) {
        return null;
      }
      updateData.chain = validatedChain;
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
    if (sanitizedBody.provider === null) {
      updateData.provider = null;
    } else if (typeof sanitizedBody.provider === 'string') {
      const validatedProvider = sanitizeProvider(sanitizedBody.provider);
      if (!validatedProvider) {
        return null;
      }
      updateData.provider = validatedProvider;
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

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const params = context.validated?.params as { id: string } | undefined;
    const id = params?.id;

    if (!id) {
      return ApiResponseBuilder.badRequest('Missing alert ID');
    }

    const validatedId = validateAlertId(id);

    if (!validatedId) {
      return ApiResponseBuilder.badRequest('Invalid alert ID');
    }

    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const alert = await getAlertById(validatedId, userId);

    if (!alert) {
      return ApiResponseBuilder.notFound('Alert not found');
    }

    return NextResponse.json({ alert });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: true },
    },
  }
);

export const PUT = createApiHandler(
  async (request: NextRequest, context) => {
    const params = context.validated?.params as { id: string } | undefined;
    const id = params?.id;

    if (!id) {
      return ApiResponseBuilder.badRequest('Missing alert ID');
    }

    const validatedId = validateAlertId(id);

    if (!validatedId) {
      return ApiResponseBuilder.badRequest('Invalid alert ID');
    }

    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const existingAlert = await getAlertById(validatedId, userId);

    if (!existingAlert) {
      return ApiResponseBuilder.notFound('Alert not found');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return ApiResponseBuilder.badRequest('Invalid JSON body');
    }

    const updateData = validateAlertUpdate(body);

    if (!updateData || Object.keys(updateData).length === 0) {
      return ApiResponseBuilder.badRequest('No valid fields to update');
    }

    const queries = getServerQueries();
    const updatedAlert = await queries.updateAlert(validatedId, updateData);

    if (!updatedAlert) {
      return ApiResponseBuilder.serverError('Failed to update alert');
    }

    return NextResponse.json({
      alert: updatedAlert,
      message: 'Alert updated successfully',
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

export const DELETE = createApiHandler(
  async (_request: NextRequest, context) => {
    const params = context.validated?.params as { id: string } | undefined;
    const id = params?.id;

    if (!id) {
      return ApiResponseBuilder.badRequest('Missing alert ID');
    }

    const validatedId = validateAlertId(id);

    if (!validatedId) {
      return ApiResponseBuilder.badRequest('Invalid alert ID');
    }

    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const existingAlert = await getAlertById(validatedId, userId);

    if (!existingAlert) {
      return ApiResponseBuilder.notFound('Alert not found');
    }

    const queries = getServerQueries();
    const success = await queries.deleteAlert(validatedId, userId);

    if (!success) {
      return ApiResponseBuilder.serverError('Failed to delete alert');
    }

    return NextResponse.json({
      message: 'Alert deleted successfully',
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
