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

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getAttesterAddress, getSampleAttesterAddress } from '@/lib/attestations/attesterAccount';
import {
  ExecutionPairVerifyBodySchema,
  type ExecutionPairVerifyBody,
} from '@/lib/attestations/executionPairVerifyRequest';
import { CURRENT_EXECUTION_PROFILE_ID } from '@/lib/attestations/executionProfiles';
import {
  EXECUTION_ATTESTER_LABEL,
  EXECUTION_DOMAIN,
  EXECUTION_TYPES,
  EXECUTION_PRIMARY_TYPE,
  CURRENT_EXECUTION_SCHEMA_VERSION,
} from '@/lib/attestations/executionReceipt';
import { buildKeyRegistryConfig } from '@/lib/attestations/keyRegistryConfig';
import { verifyExecutionPairForApi } from '@/lib/execution/executionVerificationApi';

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
  ExecutionPairVerifyBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context) => {
    const body = context.validated!.body!;
    const verification = await verifyExecutionPairForApi(body, {
      mode: 'public',
      policyId: body.policyId,
    });

    return NextResponse.json(
      ApiResponseBuilder.success(verification, { requestId: context.requestId })
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
    validation: { body: ExecutionPairVerifyBodySchema },
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
          semanticProfile: {
            profileId: CURRENT_EXECUTION_PROFILE_ID,
            registryPath: `/.well-known/oracle-registry/profiles/${CURRENT_EXECUTION_PROFILE_ID}`,
            signedField: 'profileId',
          },
          usage:
            'This is the public/historical pairing surface. POST { "preTradeAttestation": <attestation>, "executionReceipt": <ExecutionReceipt>, "policyId"?: <immutable historical policy> }. Partner production integrations must use /api/v1/partners/{partnerId}/execution/attestation/verify-pair, where policyId is required and must be active for that partner.',
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
