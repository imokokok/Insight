/**
 * Decision evidence pack endpoints.
 *
 * GET  — assemble one operation's evidence chain by a 32-byte hex UID (a
 *        pre-trade attestation UID or an execution receipt UID). The UID is
 *        the capability: it is a 256-bit unguessable identifier that appears
 *        inside the signed artifacts a customer would hand to a reviewer, so
 *        possession of it already implies possession of the evidence. The
 *        read stays unauthenticated like the sibling verify endpoint, is
 *        rate-limited and quota-counted, and never caches.
 *
 * POST — verify a pack offline-style on the service: manifest hash
 *        recomputation, assessment signature checks, client-envelope checks,
 *        and (when the full triangle is present) the closed-loop pair
 *        verification. No data is persisted.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  type ApiHandlerContext,
} from '@/lib/api/handler';
import {
  assembleDecisionEvidencePack,
  fetchDecisionEvidenceRows,
  verifyDecisionEvidencePack,
} from '@/lib/decisionInputTrust/evidencePack';

const HEX32 = /^0x[0-9a-fA-F]{64}$/;

const PackQuerySchema = z
  .object({
    preTradeUid: z.string().regex(HEX32, 'preTradeUid must be a 32-byte hex UID').optional(),
    receiptUid: z.string().regex(HEX32, 'receiptUid must be a 32-byte hex UID').optional(),
  })
  .strict()
  .refine((query) => Boolean(query.preTradeUid) !== Boolean(query.receiptUid), {
    message: 'provide exactly one of preTradeUid or receiptUid',
  });

const VerifyBodySchema = z
  .object({
    pack: z.record(z.string(), z.unknown()),
  })
  .strict();

type PackQuery = { preTradeUid?: string; receiptUid?: string };
type VerifyBody = z.infer<typeof VerifyBodySchema>;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler<
  unknown,
  Record<string, unknown>,
  PackQuery,
  Record<string, string>
>(
  async (_request: NextRequest, context: ApiHandlerContext<Record<string, unknown>, PackQuery>) => {
    const { preTradeUid, receiptUid } = context.validated!.query!;
    const uid: string = preTradeUid ?? receiptUid ?? '';

    let rows;
    try {
      rows = await fetchDecisionEvidenceRows(uid);
    } catch (error) {
      return ApiResponseBuilder.serverError(
        error instanceof Error ? error.message : 'evidence pack lookup failed',
        context.requestId
      );
    }

    if (!rows) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'NOT_FOUND',
          'no pre-trade check or execution receipt is anchored to that UID',
          {
            requestId: context.requestId,
          }
        ),
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const pack = assembleDecisionEvidencePack({
      preTradeRows: rows.preTradeRows,
      receiptRow: rows.receiptRow,
    });

    return NextResponse.json(
      ApiResponseBuilder.success(pack, {
        requestId: context.requestId,
        meta: {
          packHash: pack.manifest.packHash,
          schemaVersion: pack.manifest.schemaVersion,
          preTradeEntries: pack.preTrade.length,
          hasExecutionReceipt: pack.executionReceipt !== null,
        },
      }),
      { headers: NO_STORE_HEADERS }
    );
  },
  { middlewares: PUBLIC_MIDDLEWARES, validation: { query: PackQuerySchema } }
);

export const POST = createApiHandler<
  Awaited<ReturnType<typeof verifyDecisionEvidencePack>>,
  VerifyBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context: ApiHandlerContext<VerifyBody>) => {
    const result = await verifyDecisionEvidencePack(context.validated!.body!.pack);
    return NextResponse.json(
      ApiResponseBuilder.success(result, {
        requestId: context.requestId,
        meta: {
          integrityValid: result.integrityValid,
          closedLoopVerified: result.closedLoop?.pairedValid === true,
        },
      }),
      { headers: NO_STORE_HEADERS }
    );
  },
  { middlewares: PUBLIC_MIDDLEWARES, validation: { body: VerifyBodySchema } }
);
