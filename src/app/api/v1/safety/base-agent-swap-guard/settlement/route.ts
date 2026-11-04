/**
 * Post-settlement closure verifier for Base Agent Swap Guard decisions.
 *
 * POST /api/v1/safety/base-agent-swap-guard/settlement
 *
 * The caller presents the signed guard decision it executed under plus the
 * settlement transaction hash (and optionally the approval transaction hash).
 * Insight verifies the decision, requires the on-chain bytes to match the
 * guarded calls exactly, reconciles the observed ERC-20 fill against the guarded
 * quote, and returns a signed `BaseAgentSwapGuardSettlement` bound to the
 * `decisionHash`. A decision that does not verify, or a transaction whose bytes
 * differ from the guarded calls, is rejected — never closed over.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  type ApiHandlerContext,
} from '@/lib/api/handler';
import {
  settleBaseAgentSwapGuard,
  verifyBaseAgentSwapGuardSettlement,
} from '@/lib/dex/baseAgentSwapGuardSettlement';

const HEX_32 = /^0x[0-9a-fA-F]{64}$/;

const SettlementBodySchema = z
  .object({
    decision: z.record(z.string(), z.unknown()),
    swapTxHash: z.string().regex(HEX_32),
    approvalTxHash: z.string().regex(HEX_32).optional(),
    /** When true, only the signed settlement's own signature is verified. */
    verifyOnly: z.boolean().optional(),
    settlement: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

type SettlementBody = z.infer<typeof SettlementBodySchema>;

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler(
  async (_request: NextRequest, context: ApiHandlerContext<SettlementBody>) => {
    const body = context.validated!.body!;

    // Verify-only mode: check a previously issued settlement's signature.
    if (body.verifyOnly) {
      if (!body.settlement) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'SETTLEMENT_REQUIRED',
            'verifyOnly requires the settlement object to verify.',
            { requestId: context.requestId }
          ),
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
      const verification = await verifyBaseAgentSwapGuardSettlement(body.settlement);
      return NextResponse.json(
        ApiResponseBuilder.success(verification, {
          requestId: context.requestId,
          meta: { valid: verification.valid },
        }),
        { headers: NO_STORE_HEADERS }
      );
    }

    const result = await settleBaseAgentSwapGuard({
      decision: body.decision,
      swapTxHash: body.swapTxHash as `0x${string}`,
      approvalTxHash: (body.approvalTxHash ?? null) as `0x${string}` | null,
    });

    if (!result.ok) {
      const status =
        result.code === 'SWAP_TX_NOT_FOUND' || result.code === 'APPROVAL_TX_NOT_FOUND'
          ? 404
          : result.code === 'UNSUPPORTED_CHAIN' || result.code === 'ON_CHAIN_CALL_MISMATCH'
            ? 400
            : 502;
      return NextResponse.json(
        ApiResponseBuilder.error(result.code, result.message, {
          requestId: context.requestId,
          ...(result.reason !== undefined ? { reason: result.reason } : {}),
        }),
        { status, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          settlement: result.settlement,
          verify: `${result.settlement.verifyUrl}`,
          note: `Freshly signed BaseAgentSwapGuardSettlement bound to decisionHash ${result.settlement.decisionHash}. It certifies that the executed bytes matched the guarded calls and reports the fill against the guarded quote — it is not a claim the price was correct or that the trade was well-timed.`,
        },
        { requestId: context.requestId, meta: { reasonCodes: result.settlement.reasonCodes } }
      ),
      { headers: NO_STORE_HEADERS }
    );
  },
  { middlewares: PUBLIC_MIDDLEWARES, validation: { body: SettlementBodySchema } }
);
