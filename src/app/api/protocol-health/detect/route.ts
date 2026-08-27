import { NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler } from '@/lib/api/handler';
import { ApiResponseBuilder } from '@/lib/api/response';
import { ValidationError } from '@/lib/errors';
import { detectPositions } from '@/lib/protocols/detection';

const DetectRequestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export const POST = createApiHandler(
  async (request) => {
    const body = await request.json();

    const parseResult = DetectRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid address', {
        errors: parseResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { address } = parseResult.data;

    const detections = await detectPositions(address as `0x${string}`);

    return NextResponse.json(
      ApiResponseBuilder.success({
        address,
        detections,
        scannedAt: Date.now(),
      })
    );
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
