import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { getX402Config } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials } from '@/lib/api/x402/guard';
import {
  activateJourneyReceiptCredit,
  type ReceiptCreditState,
} from '@/lib/tradeJourney/journeyService';
import {
  createSwapIntent,
  SwapIntentAttestationUnavailableError,
  SwapIntentBodySchema,
  type SwapIntentBody,
} from '@/lib/tradeJourney/swapIntent';

/** Two oracle checks and their signatures can take the same bounded time as paid pre-trade. */
export const maxDuration = 60;
export const OPTIONS = createOptionsHandler();

function responseForIntent(
  result: Awaited<ReturnType<typeof createSwapIntent>>,
  requestId: string
) {
  return new Response(
    JSON.stringify(
      ApiResponseBuilder.success(
        {
          journeyId: result.journeyId,
          outcomeToken: result.outcomeToken,
          receiptCreditState: result.receiptCreditState,
          sourceCheck: result.sourceCheck,
          destinationCheck: result.destinationCheck,
          next: result.next,
        },
        {
          requestId,
          meta: {
            sourceVerdict: result.sourceCheck.verdict,
            destinationVerdict: result.destinationCheck.verdict,
            journeyId: result.journeyId,
          },
        }
      )
    ),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_PRESETS.noStore },
    }
  ) as NextResponse;
}

function validationError(message: string, requestId?: string): NextResponse {
  return NextResponse.json(ApiResponseBuilder.error('VALIDATION_ERROR', message, { requestId }), {
    status: 400,
    headers: { 'Cache-Control': CACHE_PRESETS.noStore },
  });
}

function parseQuery(request: NextRequest): SwapIntentBody | NextResponse {
  const parsed = SwapIntentBodySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );
  return parsed.success ? parsed.data : validationError('Invalid Swap Intent query parameters');
}

async function executeSwapIntent(input: {
  body: SwapIntentBody;
  requestId: string;
  receiptCreditState: ReceiptCreditState;
  apiKeyId?: string;
  onJourneyIssued?: (journeyId: string) => void;
}): Promise<NextResponse> {
  try {
    const result = await createSwapIntent(input.body, {
      requestId: input.requestId,
      receiptCreditState: input.receiptCreditState,
      apiKeyId: input.apiKeyId,
    });
    input.onJourneyIssued?.(result.journeyId);
    return responseForIntent(result, input.requestId);
  } catch (error) {
    if (error instanceof SwapIntentAttestationUnavailableError) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'ATTESTATION_UNAVAILABLE',
          'Swap Intent was not issued because both signed pre-trade gates are required.',
          { requestId: input.requestId }
        ),
        { status: 503, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
      );
    }
    throw error;
  }
}

const legacyPost = createApiHandler(
  async (_request, context) =>
    executeSwapIntent({
      body: context.validated!.body as SwapIntentBody,
      requestId: context.requestId,
      receiptCreditState: 'available',
      apiKeyId: context.auth?.apiKey?.keyId,
    }),
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { body: SwapIntentBodySchema },
  }
);

const legacyGet = createApiHandler(
  async (_request, context) =>
    executeSwapIntent({
      body: context.validated!.query as SwapIntentBody,
      requestId: context.requestId,
      receiptCreditState: 'available',
      apiKeyId: context.auth?.apiKey?.keyId,
    }),
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: SwapIntentBodySchema },
  }
);

/**
 * Keyless callers buy the complete intent first.  The included receipt credit
 * stays pending until the facilitator settles the x402 payment; this prevents
 * a business-success / payment-failure edge case from becoming a free receipt.
 */
export const GET = (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const cfg = getX402Config();
  if (!cfg.enabled || hasAuthCredentials(request)) return legacyGet(request, routeContext);

  let createdJourneyId: string | null = null;
  return handlePaidPreTradeRequest(
    request,
    cfg,
    async (requestId) => {
      const parsed = parseQuery(request);
      if (parsed instanceof NextResponse) return parsed;
      const response = await executeSwapIntent({
        body: parsed,
        requestId,
        receiptCreditState: 'pending_settlement',
        onJourneyIssued: (journeyId) => {
          createdJourneyId = journeyId;
        },
      });
      return response;
    },
    {
      onSettled: async (settled) => {
        if (!createdJourneyId) return;
        await activateJourneyReceiptCredit({
          journeyId: createdJourneyId,
          requestId: settled.requestId,
          payer: settled.payer,
          network: settled.network,
          txHash: settled.txHash,
        });
      },
    }
  );
};

/** API-key integrations can use JSON POST; keyless marketplace callers use GET above. */
export const POST = legacyPost;
