/** Public verifier for portable Monad Lending Guard exact-call decisions. */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  type ApiHandlerContext,
} from '@/lib/api/handler';
import { getAttesterAddress } from '@/lib/attestations/attesterAccount';
import {
  MONAD_LENDING_GUARD_ATTESTATION_DOMAIN,
  MONAD_LENDING_GUARD_ATTESTATION_PRIMARY_TYPE,
  MONAD_LENDING_GUARD_ATTESTATION_SCHEMA_VERSION,
  MONAD_LENDING_GUARD_ATTESTATION_TYPES,
  isPublishedMonadLendingGuardAttester,
  verifyMonadLendingGuardDecision,
} from '@/lib/lending/monadLendingGuardAttestation';
import { nowInSeconds } from '@/lib/utils/time';

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
    const result = await verifyMonadLendingGuardDecision(context.validated!.body!.decision);
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
    const attester = await getAttesterAddress();
    const attestationEnabled =
      attester !== null && (await isPublishedMonadLendingGuardAttester(attester, nowInSeconds()));
    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          attester,
          attestationEnabled,
          attestationStatus:
            attester === null ? 'UNCONFIGURED' : attestationEnabled ? 'READY' : 'UNTRUSTED_SIGNER',
          descriptor: {
            schemaVersion: MONAD_LENDING_GUARD_ATTESTATION_SCHEMA_VERSION,
            domain: MONAD_LENDING_GUARD_ATTESTATION_DOMAIN,
            types: MONAD_LENDING_GUARD_ATTESTATION_TYPES,
            primaryType: MONAD_LENDING_GUARD_ATTESTATION_PRIMARY_TYPE,
          },
        },
        { requestId: context.requestId }
      ),
      { headers: NO_STORE_HEADERS }
    );
  },
  { middlewares: PUBLIC_MIDDLEWARES }
);
