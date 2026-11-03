/**
 * Post-settlement closure verifier for Solana Swap Guard decisions.
 *
 * POST /api/v1/safety/solana-swap-guard/settlement
 *
 * The caller presents the signed guard decision it executed under plus the
 * on-chain transaction signature.  Insight verifies the decision, re-collects
 * execution facts from Solana JSON-RPC, reconciles the observed SPL balance
 * deltas against the reviewed exact amounts and minimum output, and returns a
 * signed `SolanaSwapGuardSettlement` bound to the `decisionHash`.  A decision
 * that does not verify is rejected — never closed over.
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
  settleSolanaSwapGuard,
  verifySolanaSwapGuardSettlement,
} from '@/lib/dex/solanaSwapGuardSettlement';

const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

const SettlementBodySchema = z
  .object({
    decision: z.record(z.string(), z.unknown()),
    signature: z.string().regex(SIGNATURE),
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
      const verification = verifySolanaSwapGuardSettlement(body.settlement);
      return NextResponse.json(
        ApiResponseBuilder.success(verification, {
          requestId: context.requestId,
          meta: { valid: verification.valid },
        }),
        { headers: NO_STORE_HEADERS }
      );
    }

    const result = await settleSolanaSwapGuard({
      decision: body.decision,
      signature: body.signature,
    });

    if (!result.ok) {
      const status =
        result.code === 'NOT_FOUND' || result.code === 'INVALID_SIGNATURE'
          ? result.code === 'NOT_FOUND'
            ? 404
            : 400
          : result.code === 'RPC_UNAVAILABLE'
            ? 502
            : 400;
      return NextResponse.json(
        ApiResponseBuilder.error(result.code, result.message, {
          requestId: context.requestId,
        }),
        { status, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          settlement: result.settlement,
          facts: {
            signature: result.facts.signature,
            status: result.facts.status,
            slot: result.facts.slot,
            sourceAmountRaw: result.facts.sourceAmountRaw,
            destinationAmountRaw: result.facts.destinationAmountRaw,
            feeLamports: result.facts.feeLamports,
          },
          note: `Freshly signed SolanaSwapGuardSettlement bound to decisionHash ${result.settlement?.payload.decisionHash ?? ''} with status ${result.settlement?.payload.status ?? 'UNKNOWN'}. It certifies the observed wallet-level fill against the guarded exact amounts — it is not a claim the price was correct or that the trade was well-timed.`,
        },
        { requestId: context.requestId, meta: { reconciliation: result.reason } }
      ),
      { headers: NO_STORE_HEADERS }
    );
  },
  { middlewares: PUBLIC_MIDDLEWARES, validation: { body: SettlementBodySchema } }
);
