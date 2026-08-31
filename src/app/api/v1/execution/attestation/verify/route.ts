/**
 * Public Execution Receipt verification endpoint.
 *
 * Anyone can POST an Execution Receipt here to verify the EIP-712 signature is
 * genuine and was issued by Insight's attester, and that the receipt is still
 * within its validity window. Intentionally UNAUTHENTICATED — verification must
 * be open so a principal can independently confirm that an agent's execution
 * matched the price Insight certified, without asking either party.
 *
 * POST /api/v1/execution/attestation/verify
 * body: { "attestation": ExecutionReceipt }
 *
 * The crypto layer always re-derives the domain/types from the schema constants
 * in this service; the `eip712` block carried in the payload is informational
 * only and never trusted for routing.
 *
 * GET  /api/v1/execution/attestation/verify  → attester identity + schema
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getAttesterAddress } from '@/lib/attestations/attesterAccount';
import {
  verifyExecutionReceipt,
  EXECUTION_ATTESTER_LABEL,
  EXECUTION_DOMAIN,
  EXECUTION_TYPES,
  EXECUTION_PRIMARY_TYPE,
  EXECUTION_SCHEMA_VERSION,
  CURRENT_EXECUTION_SCHEMA_VERSION,
  EXECUTION_VALID_FOR_SECONDS,
  EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS,
  EXECUTION_REQUIRED_PARTICIPANT_COUNT,
  EXECUTION_REQUIRED_SOURCE_GROUP_COUNT,
  type ExecutionReceipt,
} from '@/lib/attestations/executionReceipt';
import { buildKeyRegistryConfig } from '@/lib/attestations/keyRegistryConfig';

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

const VerifyBodySchema = z.object({
  attestation: z
    .object({
      uid: z.string(),
      // Routing inside the crypto layer is by this version, never by the
      // payload's informational `eip712` block.
      schemaVersion: z.literal(EXECUTION_SCHEMA_VERSION),
      attester: z.string(),
      signature: z.string(),
      data: z.record(z.string(), z.unknown()),
    })
    .passthrough(),
});

type VerifyBody = z.infer<typeof VerifyBodySchema>;

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler<
  unknown,
  VerifyBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context) => {
    const body = context.validated!.body!;
    const { attestation } = body;
    const result = await verifyExecutionReceipt(attestation as unknown as ExecutionReceipt);

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          valid: result.valid,
          attester: result.attester,
          uid: result.uid,
          executedAt: result.executedAt,
          validUntil: result.validUntil,
          expired: result.expired,
          /** The receipt's verdict: FAITHFUL / DEVIATED / NOT_EXECUTED. This is
           *  Insight's statement about whether the execution matched the
           *  certified price — never a claim that the price was correct or the
           *  trade was well-timed (verification != endorsement). */
          executionStatus: result.executionStatus,
          schemaVersion: attestation.schemaVersion,
          reason: result.reason,
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
    validation: { body: VerifyBodySchema },
  }
);

export const GET = createApiHandler<
  unknown,
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context) => {
    const attester = await getAttesterAddress();

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          attester,
          attesterLabel: EXECUTION_ATTESTER_LABEL,
          registry: buildKeyRegistryConfig(attester),
          schemaVersion: CURRENT_EXECUTION_SCHEMA_VERSION,
          validForSeconds: EXECUTION_VALID_FOR_SECONDS,
          /** Default slippage bound, published so a holder knows the fallback a
           *  receipt used when no tighter per-action bound was supplied. The
           *  binding value is always the one signed in the receipt itself. */
          defaultMaxSlippageBps: EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS,
          /** Signed alongside participantCount so a receipt is self-contained. */
          requiredParticipantCount: EXECUTION_REQUIRED_PARTICIPANT_COUNT,
          /** Same for the independence gate: distinct non-derived operator
           *  groups required, signed next to the observed count. */
          requiredSourceGroupCount: EXECUTION_REQUIRED_SOURCE_GROUP_COUNT,
          schemas: {
            '1': {
              eip712: {
                domain: EXECUTION_DOMAIN,
                types: EXECUTION_TYPES,
                primaryType: EXECUTION_PRIMARY_TYPE,
              },
            },
          },
          /** The layout new receipts are signed with. */
          eip712: {
            domain: EXECUTION_DOMAIN,
            types: EXECUTION_TYPES,
            primaryType: EXECUTION_PRIMARY_TYPE,
          },
          usage:
            'POST an ExecutionReceipt as { "attestation": <receipt> } to verify its signature and validity window.',
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
