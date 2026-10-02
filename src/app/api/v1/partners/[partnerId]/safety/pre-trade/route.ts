import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import { assertVeritasJointRun1800Admission } from '@/lib/attestations/veritasJointRunValidity';
import { InternalError } from '@/lib/errors';
import { PARTNER_IDS, type PartnerId } from '@/lib/protocol/partnerIntegrationRegistry';

const ParamsSchema = z.object({ partnerId: z.enum(PARTNER_IDS) });
type Params = { partnerId: PartnerId };
const QuerySchema = z
  .object({
    policyId: z.string().regex(/^0x[0-9a-f]{64}$/),
    asset: z.enum(['WETH', 'USDC']),
    destinationAsset: z.enum(['WETH', 'USDC']),
    chainId: z.coerce.number().int(),
    action: z.literal('swap'),
    tradeAmountUsd: z.coerce.number().positive(),
    schemaVersion: z.coerce.number().pipe(z.literal(3)),
  })
  .strict();

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler<
  unknown,
  Record<string, unknown>,
  z.infer<typeof QuerySchema>,
  Params
>(
  async (_request: NextRequest, context) => {
    const query = context.validated!.query!;
    const { partnerId } = context.validated!.params!;
    const apiKeyId = context.auth?.apiKey?.keyId;
    assertVeritasJointRun1800Admission({ partnerId, apiKeyId, ...query }, 'request');
    const result = await preTradeSafetyCheck(
      {
        asset: query.asset,
        destinationAsset: query.destinationAsset,
        chainId: query.chainId,
        action: query.action,
        tradeAmountUsd: query.tradeAmountUsd,
        schemaVersion: query.schemaVersion,
      },
      {
        apiKeyId,
        requestId: context.requestId,
        veritasJointRunPolicyId: query.policyId,
      }
    );
    if (!result.attestation || result.attestation.validForSeconds !== 1800) {
      throw new InternalError('VERITAS 1800-second gate was not signed.');
    }
    return NextResponse.json(ApiResponseBuilder.success(result, { requestId: context.requestId }), {
      headers: { 'Cache-Control': 'no-store' },
    });
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { params: ParamsSchema, query: QuerySchema },
  }
);
