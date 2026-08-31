/**
 * Public Execution-pair verification endpoint.
 *
 * A principal (protocol, explorer, another agent, the agent's own auditor) holds
 * TWO receipts from an agent: the pre-trade oracle-safety attestation it gated
 * on, and the Execution Receipt proving how it filled. Each is independently
 * verifiable, but this endpoint answers the one question a single receipt cannot:
 * "do these two describe the SAME authorized action, and did the certify →
 * execute → prove loop actually close?"
 *
 * POST /api/v1/execution/attestation/verify-pair
 * body: { "preTradeAttestation": <attestation>, "executionReceipt": <ExecutionReceipt> }
 *
 * The endpoint reuses the existing per-receipt verifiers (signature + validity
 * window) and then asserts the cryptographic binding between them
 * (preTradeUid + requestHash). It does NOT re-derive either verdict. See
 * verifyExecutionPair for the full honesty boundary.
 *
 * GET  /api/v1/execution/attestation/verify-pair  → describes the pairing proof
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getAttesterAddress } from '@/lib/attestations/attesterAccount';
import {
  EXECUTION_ATTESTER_LABEL,
  EXECUTION_DOMAIN,
  EXECUTION_TYPES,
  EXECUTION_PRIMARY_TYPE,
  EXECUTION_SCHEMA_VERSION,
  CURRENT_EXECUTION_SCHEMA_VERSION,
} from '@/lib/attestations/executionReceipt';
import { buildKeyRegistryConfig } from '@/lib/attestations/keyRegistryConfig';
import {
  verifyExecutionPair,
  type PreTradeAttestationInput,
} from '@/lib/execution/verifyExecutionPair';

/** Loose envelope for the pre-trade attestation: only the top-level shape is
 *  enforced here; the crypto layer re-derives the hash, so a tampered `data`
 *  fails signature recovery rather than being trusted. */
const PreTradeAttestationSchema = z
  .object({
    uid: z.string(),
    schemaVersion: z.number(),
    attester: z.string(),
    data: z.record(z.string(), z.any()),
    eip712: z
      .object({
        domain: z.record(z.string(), z.any()),
        types: z.record(z.string(), z.any()),
        primaryType: z.string(),
      })
      .passthrough()
      .optional(),
    type: z.string().optional(),
    signature: z.string(),
    verifyUrl: z.string().optional(),
  })
  .passthrough();

/** Loose envelope for the Execution Receipt (same philosophy). */
const ExecutionReceiptSchema = z
  .object({
    uid: z.string(),
    schemaVersion: z.literal(EXECUTION_SCHEMA_VERSION),
    attester: z.string(),
    signature: z.string(),
    data: z.record(z.string(), z.any()),
  })
  .passthrough();

const VerifyPairBodySchema = z.object({
  preTradeAttestation: PreTradeAttestationSchema,
  executionReceipt: ExecutionReceiptSchema,
});

type VerifyPairBody = z.infer<typeof VerifyPairBodySchema>;

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
  VerifyPairBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context) => {
    const body = context.validated!.body!;
    const result = await verifyExecutionPair(
      body.preTradeAttestation as unknown as PreTradeAttestationInput,
      body.executionReceipt as never
    );

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          pairedValid: result.pairedValid,
          closedLoopStatus: result.closedLoopStatus,
          reason: result.reason,
          binding: result.binding,
          preTrade: {
            valid: result.preTrade.valid,
            expired: result.preTrade.expired,
            uid: result.preTrade.uid,
            schemaVersion: result.preTrade.schemaVersion,
            attester: result.preTrade.attester,
            reason: result.preTrade.reason,
          },
          execution: result.execution,
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
    validation: { body: VerifyPairBodySchema },
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
          usage:
            'POST { "preTradeAttestation": <attestation>, "executionReceipt": <ExecutionReceipt> } ' +
            'to prove the two receipts describe the same authorized action and the ' +
            'certify → execute → prove loop closed.',
          pairBinding: {
            preTradeUid: 'executionReceipt.data.preTradeUid must equal preTradeAttestation.uid',
            requestHash:
              'executionReceipt.data.requestHash must equal preTradeAttestation.data.requestHash',
          },
          executionReceiptEip712: {
            domain: EXECUTION_DOMAIN,
            types: EXECUTION_TYPES,
            primaryType: EXECUTION_PRIMARY_TYPE,
          },
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
