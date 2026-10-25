/** Public verifier for portable Polygon, Arbitrum and BNB Lending Guard decisions. */

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
  MULTICHAIN_EVM_LENDING_GUARD_ATTESTATION_DOMAIN,
  MULTICHAIN_EVM_LENDING_GUARD_ATTESTATION_PRIMARY_TYPE,
  MULTICHAIN_EVM_LENDING_GUARD_ATTESTATION_SCHEMA_VERSION,
  MULTICHAIN_EVM_LENDING_GUARD_ATTESTATION_TYPES,
  isPublishedMultichainEvmLendingGuardAttester,
  verifyMultichainEvmLendingGuardDecision,
} from '@/lib/lending/multichainEvmLendingGuardAttestation';
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
    const result = await verifyMultichainEvmLendingGuardDecision(context.validated!.body!.decision);
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
      attester !== null &&
      (await isPublishedMultichainEvmLendingGuardAttester(attester, nowInSeconds()));
    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          attester,
          attestationEnabled,
          attestationStatus:
            attester === null ? 'UNCONFIGURED' : attestationEnabled ? 'READY' : 'UNTRUSTED_SIGNER',
          descriptor: {
            schemaVersion: MULTICHAIN_EVM_LENDING_GUARD_ATTESTATION_SCHEMA_VERSION,
            domain: MULTICHAIN_EVM_LENDING_GUARD_ATTESTATION_DOMAIN,
            types: MULTICHAIN_EVM_LENDING_GUARD_ATTESTATION_TYPES,
            primaryType: MULTICHAIN_EVM_LENDING_GUARD_ATTESTATION_PRIMARY_TYPE,
          },
        },
        { requestId: context.requestId }
      ),
      { headers: NO_STORE_HEADERS }
    );
  },
  { middlewares: PUBLIC_MIDDLEWARES }
);
