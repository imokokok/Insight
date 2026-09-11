/** Policy-bound partner verification for the certify -> execute -> prove pair. */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import {
  PartnerExecutionPairVerifyBodySchema,
  type PartnerExecutionPairVerifyBody,
} from '@/lib/attestations/executionPairVerifyRequest';
import { CURRENT_ORACLE_REGISTRY_RELEASE_ID } from '@/lib/attestations/oracleRegistryRelease';
import { verifyExecutionPairForApi } from '@/lib/execution/executionVerificationApi';
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
  PartnerExecutionPairVerifyBody,
  Record<string, unknown>,
  PartnerParams
>(
  async (_request: NextRequest, context) => {
    const body = context.validated!.body!;
    const { partnerId } = context.validated!.params!;
    const verification = await verifyExecutionPairForApi(body, {
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
    validation: { body: PartnerExecutionPairVerifyBodySchema, params: PartnerParamsSchema },
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
          requiredBodyFields: ['preTradeAttestation', 'executionReceipt', 'policyId'],
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
