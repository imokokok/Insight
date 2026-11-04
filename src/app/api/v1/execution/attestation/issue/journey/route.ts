import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { ApiResponseBuilder, createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { recordExecutionReceipt } from '@/lib/execution/executionReceiptAudit';
import { issueExecutionReceipt } from '@/lib/execution/executionReceiptService';
import {
  ExecutionReceiptIssueBodySchema,
  type ExecutionReceiptIssueBody,
} from '@/lib/execution/issueSchema';
import {
  claimJourneyReceiptCredit,
  completeJourneyReceiptCredit,
  findJourneyReceipt,
  releaseJourneyReceiptCredit,
} from '@/lib/tradeJourney/journeyService';

const JourneyReceiptIssueBodySchema = ExecutionReceiptIssueBodySchema.extend({
  journeyId: z.string().uuid(),
  outcomeToken: z.string().min(32).max(256),
}).superRefine((value, context) => {
  if (!value.preTradeAttestations) {
    context.addIssue({
      code: 'custom',
      path: ['preTradeAttestations'],
      message: 'A journey receipt requires both signed pre-trade attestations',
    });
  }
  if (!value.destinationPreTradeUid) {
    context.addIssue({
      code: 'custom',
      path: ['destinationPreTradeUid'],
      message: 'A journey receipt requires the destination pre-trade UID',
    });
  }
});

type JourneyReceiptIssueBody = ExecutionReceiptIssueBody & {
  journeyId: string;
  outcomeToken: string;
};

export const OPTIONS = createOptionsHandler();

function issueErrorStatus(code: string): number {
  if (
    code === 'UNSUPPORTED_CHAIN' ||
    code === 'PRE_TRADE_VERIFICATION_FAILED' ||
    code === 'UNSUPPORTED_CROSS_CHAIN' ||
    code === 'UNCOMMITTED_EXECUTION_POLICY' ||
    code === 'INVALID_QUOTE_BASIS' ||
    code === 'SELECTED_EVENT_INVALID'
  ) {
    return 400;
  }
  if (code === 'NOT_FOUND') return 404;
  if (code === 'SIGNING_UNAVAILABLE') return 503;
  return 502;
}

function replayResponse(receipt: unknown, requestId: string): NextResponse {
  const data = receipt as {
    data?: { priceExecutionStatus?: unknown; executionStatus?: unknown; bindingMode?: unknown };
  };
  return NextResponse.json(
    ApiResponseBuilder.success(
      {
        attestation: receipt,
        replayed: true,
        executionStatus: data.data?.priceExecutionStatus ?? data.data?.executionStatus ?? null,
        bindingMode: data.data?.bindingMode ?? null,
        note: 'This is the already-issued receipt for the journey. The included credit was not consumed again.',
      },
      { requestId }
    )
  );
}

/**
 * Redeem the one receipt credit created by a settled Swap Intent.  This is
 * intentionally a separate, capability-protected route from the API-key
 * endpoint: it gives x402-only agents a complete path without weakening the
 * standard v1 API-key boundary.
 */
export const POST = createApiHandler<
  unknown,
  JourneyReceiptIssueBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context) => {
    const body = context.validated!.body!;
    const claim = await claimJourneyReceiptCredit({
      journeyId: body.journeyId,
      outcomeToken: body.outcomeToken,
      sourcePreTradeUid: body.preTradeUid,
      destinationPreTradeUid: body.destinationPreTradeUid ?? '',
    });

    if (!claim.ok) {
      if (claim.code === 'RECEIPT_ALREADY_ISSUED' || claim.code === 'RECEIPT_IN_PROGRESS') {
        const existing = await findJourneyReceipt(body.journeyId);
        if (existing) {
          if (claim.code === 'RECEIPT_IN_PROGRESS') {
            await completeJourneyReceiptCredit(
              body.journeyId,
              (existing as { uid?: string }).uid ?? 'persisted-receipt'
            );
          }
          return replayResponse(existing, context.requestId);
        }
      }

      const status =
        claim.code === 'NOT_FOUND' || claim.code === 'TOKEN_INVALID'
          ? 404
          : claim.code === 'CREDIT_UNAVAILABLE'
            ? 409
            : 409;
      return NextResponse.json(
        ApiResponseBuilder.error(
          claim.code,
          claim.code === 'CREDIT_UNAVAILABLE'
            ? 'The included receipt is not available yet. Wait for the originating x402 settlement to complete.'
            : 'The journey cannot issue this receipt.',
          { requestId: context.requestId }
        ),
        { status }
      );
    }

    const startedAt = Date.now();
    const result = await issueExecutionReceipt({
      preTradeUid: body.preTradeUid as `0x${string}`,
      requestHash: body.requestHash as `0x${string}`,
      sourceAssetId: body.sourceAssetId,
      destinationAssetId: body.destinationAssetId,
      subjectChainId: body.subjectChainId,
      settlementChainId: body.settlementChainId,
      participantCount: body.participantCount,
      sourceGroupCount: body.sourceGroupCount,
      preTradeSignedAt: body.preTradeSignedAt,
      quotedPrice: body.quotedPrice,
      maxSlippageBps: body.maxSlippageBps,
      action: body.action,
      quotedAmountUsd: body.quotedAmountUsd,
      executedAmountUsd: body.executedAmountUsd,
      actualFeeUsd: body.actualFeeUsd,
      mevRiskScore: body.mevRiskScore,
      quoteVenueIndependent: body.quoteVenueIndependent,
      quoteBasis: body.quoteBasis,
      quoteBlockNumber: body.quoteBlockNumber,
      priceStateAgeAtExecSeconds: body.priceStateAgeAtExecSeconds,
      claimRole: body.claimRole,
      destinationPreTradeUid: (body.destinationPreTradeUid ?? null) as `0x${string}` | null,
      txHash: body.txHash as `0x${string}`,
      selectedSwapLogIndex: body.selectedSwapLogIndex,
      taker: body.taker as `0x${string}` | undefined,
      preTradeAttestations: {
        source: body.preTradeAttestations!.source as never,
        destination: body.preTradeAttestations!.destination as never,
      },
    });

    if (!result.ok) {
      await releaseJourneyReceiptCredit(body.journeyId);
      return NextResponse.json(
        ApiResponseBuilder.error(result.code, result.message, { requestId: context.requestId }),
        { status: issueErrorStatus(result.code) }
      );
    }

    try {
      await recordExecutionReceipt(result.receipt, {
        source: 'rest',
        journeyId: body.journeyId,
        latencyMs: Date.now() - startedAt,
        subjectChainId: body.subjectChainId,
        settlementChainId: body.settlementChainId,
      });
    } catch {
      await releaseJourneyReceiptCredit(body.journeyId);
      return NextResponse.json(
        ApiResponseBuilder.error(
          'AUDIT_PERSISTENCE_FAILED',
          'The receipt was signed but could not be durably stored; retry with the same request.',
          { requestId: context.requestId }
        ),
        { status: 503 }
      );
    }

    try {
      await completeJourneyReceiptCredit(body.journeyId, result.receipt.uid);
    } catch {
      // The durable receipt is now retrievable by journey id; a retry will
      // repair the lifecycle state without issuing or charging a second proof.
      return NextResponse.json(
        ApiResponseBuilder.error(
          'RECEIPT_FINALIZATION_PENDING',
          'Receipt was durably stored but the journey has not finalized. Retry with the same request.',
          { requestId: context.requestId }
        ),
        { status: 503 }
      );
    }

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://www.oracleinsight.xyz'
        : 'http://localhost:3000');

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          attestation: result.receipt,
          wellKnown: `${base}/.well-known/oracle-keys.json`,
          verify: `${base}/api/v1/execution/attestation/verify`,
          executionStatus:
            result.receipt.data.priceExecutionStatus ?? result.receipt.data.executionStatus,
          bindingMode: result.receipt.data.bindingMode,
          binding: result.binding,
          selectedEvent: result.facts.selectedEvent ?? null,
          journeyId: body.journeyId,
          note: 'The receipt binds the submitted transaction to both signature-verified pre-trade gates. It does not claim the reference price was objectively correct.',
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    // Outcome token is the authorization for this limited, single-use action;
    // do not require or accept a reusable API key for x402-only callers.
    middlewares: { logging: true, rateLimit: { preset: 'api' }, cors: true },
    validation: { body: JourneyReceiptIssueBodySchema },
  }
);
