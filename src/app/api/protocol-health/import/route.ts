import { NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler } from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';
import { ValidationError } from '@/lib/errors';
import { importPosition } from '@/lib/protocols/importer';
import { getProtocolById } from '@/lib/protocols/protocolRegistry';

const ImportRequestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  protocolId: z.string().min(1),
});

export const POST = createApiHandler(
  async (request) => {
    const body = await request.json();

    const parseResult = ImportRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid import request', {
        errors: parseResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { address, protocolId } = parseResult.data;

    const protocol = getProtocolById(protocolId);
    if (!protocol) {
      throw new ValidationError('Protocol not found', {
        details: { protocolId },
      });
    }

    const position = await importPosition(protocol, address as `0x${string}`);

    return NextResponse.json(ApiResponseBuilder.success(position));
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: false },
      cors: true,
    },
    skipInternalAuthAndRateLimit: false,
  }
);
