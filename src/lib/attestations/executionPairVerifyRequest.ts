import { z } from 'zod';

import {
  EXECUTION_SCHEMA_VERSION,
  EXECUTION_SCHEMA_VERSION_V2,
  EXECUTION_SCHEMA_VERSION_V3,
  EXECUTION_SCHEMA_VERSION_V4,
  EXECUTION_SCHEMA_VERSION_V5,
} from '@/lib/attestations/executionReceipt';

const PolicyIdSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);

/** Loose envelope: the crypto verifier re-derives the signed digest. */
export const PreTradeAttestationInputSchema = z
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

/** All published execution layouts remain verifiable. */
export const ExecutionReceiptInputSchema = z
  .object({
    uid: z.string(),
    schemaVersion: z.union([
      z.literal(EXECUTION_SCHEMA_VERSION),
      z.literal(EXECUTION_SCHEMA_VERSION_V2),
      z.literal(EXECUTION_SCHEMA_VERSION_V3),
      z.literal(EXECUTION_SCHEMA_VERSION_V4),
      z.literal(EXECUTION_SCHEMA_VERSION_V5),
    ]),
    attester: z.string(),
    signature: z.string(),
    data: z.record(z.string(), z.any()),
  })
  .passthrough();

const ExecutionPairVerifyPayloadSchema = z.object({
  preTradeAttestation: PreTradeAttestationInputSchema,
  executionReceipt: ExecutionReceiptInputSchema,
  /** v3+: required when the receipt commits to a destination pre-trade gate. */
  destinationPreTradeAttestation: PreTradeAttestationInputSchema.optional(),
});

export const ExecutionPairVerifyBodySchema = ExecutionPairVerifyPayloadSchema.extend({
  /** Optional only on the public, non-partner verification surface. */
  policyId: PolicyIdSchema.optional(),
});

/** A partner runtime path never falls back to policy-free verification. */
export const PartnerExecutionPairVerifyBodySchema = ExecutionPairVerifyPayloadSchema.extend({
  policyId: PolicyIdSchema,
});

export type ExecutionPairVerifyBody = z.infer<typeof ExecutionPairVerifyBodySchema>;
export type PartnerExecutionPairVerifyBody = z.infer<typeof PartnerExecutionPairVerifyBodySchema>;
