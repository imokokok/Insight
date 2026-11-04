/** Public verifier and attester-discovery endpoint for Solana Lending Guard decisions. */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  type ApiHandlerContext,
} from '@/lib/api/handler';
import { solanaEvidenceSignerPublicKey } from '@/lib/execution/solanaEvidence';
import {
  SOLANA_LENDING_GUARD_ATTESTATION_SCHEMA,
  SOLANA_LENDING_GUARD_VALID_FOR_SECONDS,
  verifySolanaLendingGuardDecision,
} from '@/lib/lending/solanaLendingGuardAttestation';

const VerifyBodySchema = z.object({ decision: z.record(z.string(), z.unknown()) }).strict();
type VerifyBody = z.infer<typeof VerifyBodySchema>;
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
  async (_request: NextRequest, context: ApiHandlerContext<VerifyBody>) => {
    const result = verifySolanaLendingGuardDecision(context.validated!.body!.decision);
    return NextResponse.json(
      ApiResponseBuilder.success(result, {
        requestId: context.requestId,
        meta: { valid: result.valid, expired: result.expired },
      }),
      { headers: NO_STORE_HEADERS }
    );
  },
  { middlewares: PUBLIC_MIDDLEWARES, validation: { body: VerifyBodySchema } }
);
export const GET = createApiHandler(
  async (_request, context) => {
    const attester = solanaEvidenceSignerPublicKey();
    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          attester,
          attestationEnabled: attester !== null,
          attestationStatus: attester === null ? 'UNCONFIGURED' : 'READY',
          descriptor: {
            schema: SOLANA_LENDING_GUARD_ATTESTATION_SCHEMA,
            algorithm: 'ed25519',
            validForSeconds: SOLANA_LENDING_GUARD_VALID_FOR_SECONDS,
          },
        },
        { requestId: context.requestId }
      ),
      { headers: NO_STORE_HEADERS }
    );
  },
  { middlewares: PUBLIC_MIDDLEWARES }
);
