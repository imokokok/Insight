import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler } from '@/lib/api/handler';
import { fetchPolymarketPositionsPage, PolymarketDataApiError } from '@/lib/polymarket/positions';

const MAX_CURSOR_LENGTH = 8_192;
const PositionQuerySchema = z.object({
  user: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  cursor: z
    .string()
    .max(MAX_CURSOR_LENGTH)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value))
    .optional(),
});

export const dynamic = 'force-dynamic';

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { user, cursor } = context.validated!.query as z.infer<typeof PositionQuerySchema>;
    const headers = { 'Cache-Control': 'private, no-store' };

    try {
      const page = await fetchPolymarketPositionsPage(user, cursor);
      return NextResponse.json(page, { headers });
    } catch (error) {
      if (error instanceof PolymarketDataApiError) {
        const status = error.status === 429 ? 503 : 502;
        return NextResponse.json(
          {
            error:
              error.status === 429 ? 'Polymarket data is busy. Try again shortly.' : error.message,
          },
          {
            status,
            headers: {
              ...headers,
              ...(error.retryAfter ? { 'Retry-After': error.retryAfter } : {}),
            },
          }
        );
      }
      return NextResponse.json(
        { error: 'Polymarket positions could not be loaded. Check your connection and try again.' },
        { status: 502, headers }
      );
    }
  },
  {
    middlewares: { logging: true, rateLimit: { preset: 'moderate' } },
    validation: { query: PositionQuerySchema },
  }
);
