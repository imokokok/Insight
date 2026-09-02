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
import {
  getAttesterAddress,
  getSampleAttesterAddress,
} from '@/lib/attestations/attesterAccount';
import {
  EXECUTION_ATTESTER_LABEL,
  EXECUTION_DOMAIN,
  EXECUTION_TYPES,
  EXECUTION_PRIMARY_TYPE,
  EXECUTION_SCHEMA_VERSION,
  EXECUTION_SCHEMA_VERSION_V2,
  EXECUTION_SCHEMA_VERSION_V3,
  EXECUTION_SCHEMA_VERSION_V4,
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

/** Loose envelope for the Execution Receipt (same philosophy). Accepts all
 *  published schema versions — v1 predates the signed binding fields, v2 adds
 *  bindingMode + preTradeSignedAt, v3 carries the full quote-basis, subject and
 *  scope commitments, and v4 (current) adds the signed `environment` message
 *  field. A literal(1) here would silently reject every real receipt, so we
 *  accept the supported schema set. */
const ExecutionReceiptSchema = z
  .object({
    uid: z.string(),
    schemaVersion: z.union([
      z.literal(EXECUTION_SCHEMA_VERSION),
      z.literal(EXECUTION_SCHEMA_VERSION_V2),
      z.literal(EXECUTION_SCHEMA_VERSION_V3),
      z.literal(EXECUTION_SCHEMA_VERSION_V4),
    ]),
    attester: z.string(),
    signature: z.string(),
    data: z.record(z.string(), z.any()),
  })
  .passthrough();

const VerifyPairBodySchema = z.object({
  preTradeAttestation: PreTradeAttestationSchema,
  executionReceipt: ExecutionReceiptSchema,
  /** v3 only: the destination pre-trade gate when the Execution Receipt commits
   *  to one via data.destinationPreTradeUid. Required for v3 receipts signed
   *  with a two-gate VERIFIED binding. */
  destinationPreTradeAttestation: PreTradeAttestationSchema.optional(),
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
      body.executionReceipt as never,
      body.destinationPreTradeAttestation as unknown as PreTradeAttestationInput | undefined
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
          destinationPreTrade: result.destinationPreTrade
            ? {
                valid: result.destinationPreTrade.valid,
                expired: result.destinationPreTrade.expired,
                uid: result.destinationPreTrade.uid,
                schemaVersion: result.destinationPreTrade.schemaVersion,
                attester: result.destinationPreTrade.attester,
                reason: result.destinationPreTrade.reason,
              }
            : null,
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
          registry: buildKeyRegistryConfig(attester, await getSampleAttesterAddress()),
          schemaVersion: CURRENT_EXECUTION_SCHEMA_VERSION,
          usage:
            'POST { "preTradeAttestation": <attestation>, "executionReceipt": <ExecutionReceipt> } ' +
            'to prove the two receipts describe the same authorized action and the ' +
            'certify → execute → prove loop closed.',
          pairBinding: {
            preTradeUid: 'executionReceipt.data.preTradeUid must equal preTradeAttestation.uid',
            requestHash:
              'executionReceipt.data.requestHash must equal preTradeAttestation.data.requestHash',
            destinationPreTradeUid:
              'v3+: when executionReceipt.data.destinationPreTradeUid is set, it must equal destinationPreTradeAttestation.uid and that gate must verify',
            preTradeUidsHash:
              'v3+: executionReceipt.data.preTradeUidsHash must recompute from the presented gate uids, in order (source then destination)',
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
