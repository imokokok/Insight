import { NextResponse } from 'next/server';

import { z } from 'zod';

import { ApiResponseBuilder, createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { reportJourneyNotExecuted } from '@/lib/tradeJourney/journeyService';

const OutcomeBodySchema = z.object({
  journeyId: z.string().uuid(),
  outcomeToken: z.string().min(32).max(256),
  reason: z.enum([
    'risk_caution',
    'market_changed',
    'user_cancelled',
    'integration_failed',
    'other',
  ]),
});

export const OPTIONS = createOptionsHandler();

/**
 * Voluntary terminal feedback for a checked journey. It intentionally says
 * nothing about chain state: an absent receipt is not evidence of no trade.
 */
export const POST = createApiHandler(
  async (_request, context) => {
    const body = context.validated!.body as z.infer<typeof OutcomeBodySchema>;
    const outcome = await reportJourneyNotExecuted(body);
    if (outcome === 'not_found' || outcome === 'token_invalid') {
      return NextResponse.json(
        ApiResponseBuilder.error('JOURNEY_NOT_FOUND', 'Journey was not found.', {
          requestId: context.requestId,
        }),
        { status: 404 }
      );
    }
    if (outcome === 'not_open') {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'JOURNEY_NOT_OPEN',
          'Journey already has a terminal or in-progress execution state.',
          { requestId: context.requestId }
        ),
        { status: 409 }
      );
    }
    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          recorded: true,
          executionState: 'not_executed_reported',
          note: 'Recorded as a voluntary caller report. It is not proof that no on-chain execution occurred.',
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: { logging: true, rateLimit: { preset: 'api' }, cors: true },
    validation: { body: OutcomeBodySchema },
  }
);
