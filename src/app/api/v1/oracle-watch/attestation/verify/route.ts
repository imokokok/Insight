/**
 * Public Oracle Watch attestation verification endpoint.
 *
 * Anyone can POST a Watch attestation here to verify the EIP-712 signature is
 * genuine and was issued by Insight's attester, and that the attestation is
 * still within its validity window. Intentionally UNAUTHENTICATED —
 * verification must be open so counterparties can independently confirm the
 * trust signal an agent claims to have gated on.
 *
 * POST /api/v1/oracle-watch/attestation/verify
 * body: { "attestation": OracleWatchAttestation }
 *
 * The crypto layer always re-derives the domain/types from the schema constants
 * in this service; the `eip712` block carried in the payload is informational
 * only and never trusted for routing.
 *
 * GET  /api/v1/oracle-watch/attestation/verify  → attester identity + schema
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getAttesterAddress, getSampleAttesterAddress } from '@/lib/attestations/attesterAccount';
import { buildKeyRegistryConfig } from '@/lib/attestations/keyRegistryConfig';
import {
  verifyWatchAttestation,
  WATCH_DOMAIN,
  WATCH_TYPES,
  WATCH_TYPES_V2,
  WATCH_PRIMARY_TYPE,
  WATCH_SCHEMA_VERSION,
  WATCH_SCHEMA_VERSION_V2,
  CURRENT_WATCH_SCHEMA_VERSION,
  WATCH_VALID_FOR_SECONDS,
  WATCH_REQUIRED_PARTICIPANT_COUNT,
  WATCH_REQUIRED_SOURCE_GROUP_COUNT,
  type OracleWatchAttestation,
} from '@/lib/attestations/oracleWatchAttestation';

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
      // v1 receipts stay verifiable after the v2 upgrade; routing inside the
      // crypto layer is by this version, not by the payload's `eip712` block.
      schemaVersion: z.union([z.literal(WATCH_SCHEMA_VERSION), z.literal(WATCH_SCHEMA_VERSION_V2)]),
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
    const result = await verifyWatchAttestation(attestation as unknown as OracleWatchAttestation);

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          valid: result.valid,
          attester: result.attester,
          uid: result.uid,
          evaluatedAt: result.checkedAt,
          validUntil: result.validUntil,
          expired: result.expired,
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
          registry: buildKeyRegistryConfig(attester, await getSampleAttesterAddress()),
          schemaVersion: CURRENT_WATCH_SCHEMA_VERSION,
          validForSeconds: WATCH_VALID_FOR_SECONDS,
          /** Signed alongside participantCount so a receipt is self-contained:
           *  a holder can check the quorum gate without our source code. */
          requiredParticipantCount: WATCH_REQUIRED_PARTICIPANT_COUNT,
          /** Same for the independence gate: distinct non-derived operator
           *  groups required, signed next to the observed count. */
          requiredSourceGroupCount: WATCH_REQUIRED_SOURCE_GROUP_COUNT,
          /** Every schema version this endpoint still verifies. v1 is retired
           *  for signing but must keep validating for receipts in the wild. */
          schemas: {
            '1': {
              eip712: { domain: WATCH_DOMAIN, types: WATCH_TYPES, primaryType: WATCH_PRIMARY_TYPE },
            },
            '2': {
              eip712: {
                domain: WATCH_DOMAIN,
                types: WATCH_TYPES_V2,
                primaryType: WATCH_PRIMARY_TYPE,
              },
            },
          },
          /** The layout new receipts are signed with. */
          eip712: {
            domain: WATCH_DOMAIN,
            types: WATCH_TYPES_V2,
            primaryType: WATCH_PRIMARY_TYPE,
          },
          usage:
            'POST an OracleWatchAttestation as { "attestation": <receipt> } to verify its signature and validity window.',
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
