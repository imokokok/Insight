import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { sanitizeObject, sanitizeString, sanitizeUuid } from '@/lib/security';
import { getServerQueries } from '@/lib/supabase/server';

const MAX_NAME_LENGTH = 100;

function validateSnapshotId(id: string): string | null {
  return sanitizeUuid(id) || null;
}

function validateSnapshotUpdate(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const sanitizedBody = sanitizeObject(body as Record<string, unknown>);
  const updateData: Record<string, unknown> = {};

  if (sanitizedBody.name !== undefined) {
    if (typeof sanitizedBody.name === 'string') {
      updateData.name = sanitizeString(sanitizedBody.name, { maxLength: MAX_NAME_LENGTH });
    } else if (sanitizedBody.name === null) {
      updateData.name = null;
    } else {
      return null;
    }
  }

  if (sanitizedBody.is_public !== undefined) {
    if (typeof sanitizedBody.is_public === 'boolean') {
      updateData.is_public = sanitizedBody.is_public;
    } else {
      return null;
    }
  }

  return updateData;
}

async function getSnapshotById(id: string, userId: string) {
  const queries = getServerQueries();
  const snapshot = await queries.getSnapshotById(id);
  if (snapshot && snapshot.user_id !== userId) {
    return null;
  }
  return snapshot;
}

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const params = context.validated?.params as { id: string } | undefined;
    const id = params?.id;

    if (!id) {
      return ApiResponseBuilder.badRequest('Missing snapshot ID');
    }

    const validatedId = validateSnapshotId(id);

    if (!validatedId) {
      return ApiResponseBuilder.badRequest('Invalid snapshot ID');
    }

    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const snapshot = await getSnapshotById(validatedId, userId);

    if (!snapshot) {
      return ApiResponseBuilder.notFound('Snapshot not found');
    }

    return NextResponse.json({ snapshot });
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
      return ApiResponseBuilder.badRequest('Missing snapshot ID');
    }

    const validatedId = validateSnapshotId(id);

    if (!validatedId) {
      return ApiResponseBuilder.badRequest('Invalid snapshot ID');
    }

    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const existingSnapshot = await getSnapshotById(validatedId, userId);

    if (!existingSnapshot) {
      return ApiResponseBuilder.notFound('Snapshot not found');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return ApiResponseBuilder.badRequest('Invalid JSON body');
    }

    const updateData = validateSnapshotUpdate(body);

    if (!updateData || Object.keys(updateData).length === 0) {
      return ApiResponseBuilder.badRequest('No valid fields to update');
    }

    const queries = getServerQueries();
    const updatedSnapshot = await queries.updateSnapshot(validatedId, updateData);

    if (!updatedSnapshot) {
      return ApiResponseBuilder.serverError('Failed to update snapshot');
    }

    return NextResponse.json({
      snapshot: updatedSnapshot,
      message: 'Snapshot updated successfully',
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
      return ApiResponseBuilder.badRequest('Missing snapshot ID');
    }

    const validatedId = validateSnapshotId(id);

    if (!validatedId) {
      return ApiResponseBuilder.badRequest('Invalid snapshot ID');
    }

    const userId = context.auth?.userId;
    if (!userId) {
      return ApiResponseBuilder.unauthorized();
    }

    const existingSnapshot = await getSnapshotById(validatedId, userId);

    if (!existingSnapshot) {
      return ApiResponseBuilder.notFound('Snapshot not found');
    }

    const queries = getServerQueries();
    const success = await queries.deleteSnapshot(validatedId);

    if (!success) {
      return ApiResponseBuilder.serverError('Failed to delete snapshot');
    }

    return NextResponse.json({
      message: 'Snapshot deleted successfully',
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
