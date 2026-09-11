/**
 * Policy-bound partner Execution Receipt verification.
 *
 * Unlike the public historical verifier, this route cannot run without an
 * explicit partner id in the URL and an immutable policy id in the body.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import {
  PartnerExecutionVerifyBodySchema,
  type PartnerExecutionVerifyBody,
} from '@/lib/attestations/executionVerifyRequest';
import { CURRENT_ORACLE_REGISTRY_RELEASE_ID } from '@/lib/attestations/oracleRegistryRelease';
import { verifyExecutionReceiptForApi } from '@/lib/execution/executionVerificationApi';
import {
  PARTNER_IDS,
  ORACLE_REGISTRY_RELEASE_PIN_RULE,
  activePartnerIntegrationPolicy,
  type PartnerId,
} from '@/lib/protocol/partnerIntegrationRegistry';

const PartnerParamsSchema = z.object({ partnerId: z.enum(PARTNER_IDS) });
type PartnerParams = { partnerId: PartnerId };

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler<
  unknown,
  PartnerExecutionVerifyBody,
  Record<string, unknown>,
  PartnerParams
>(
  async (_request: NextRequest, context) => {
    const body = context.validated!.body!;
    const { partnerId } = context.validated!.params!;
    const verification = await verifyExecutionReceiptForApi(body.attestation, {
      mode: 'partner',
      partnerId,
      policyId: body.policyId,
    });

    return NextResponse.json(
      ApiResponseBuilder.success(verification, { requestId: context.requestId })
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
    validation: { body: PartnerExecutionVerifyBodySchema, params: PartnerParamsSchema },
  }
);

export const GET = createApiHandler<
  unknown,
  Record<string, unknown>,
  Record<string, unknown>,
  PartnerParams
>(
  async (_request: NextRequest, context) => {
    const { partnerId } = context.validated!.params!;
    const policy = activePartnerIntegrationPolicy(partnerId)!;

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          partnerId,
          requiredPolicyId: policy.policyId,
          registryReleaseId: CURRENT_ORACLE_REGISTRY_RELEASE_ID,
          registryReleasePinRule: ORACLE_REGISTRY_RELEASE_PIN_RULE,
          productionReachability: policy.productionReachability,
          requiredBodyFields: ['attestation', 'policyId'],
          rule: 'policyId must equal the active immutable policy for partnerId; the current registry release must equal or descend through predecessorReleaseId from at least one policy-pinned release; productionReachability and execution schema/profile admission are enforced at runtime',
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
    validation: { params: PartnerParamsSchema },
  }
);
