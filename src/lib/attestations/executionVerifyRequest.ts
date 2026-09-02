/**
 * Request schema for POST /api/v1/execution/attestation/verify.
 *
 * This lives outside the route module on purpose. Next.js validates the
 * exported members of a route file, so `export`ing the schema from
 * `route.ts` is not an option — and an untested schema is exactly how the
 * v1-only `z.literal` slipped in and rejected every v2 receipt.
 *
 * All published schema versions are accepted: v1 predates the signed binding
 * fields, v2 (what issueExecutionReceipt emitted before the VERITAS pass) adds
 * bindingMode + preTradeSignedAt, and v3 (the current emitter) carries the
 * full quote-basis, subject and scope commitments. Rejecting any of them would
 * break real receipts before they ever reach the verifier.
 */

import { z } from 'zod';

import {
  EXECUTION_SCHEMA_VERSION,
  EXECUTION_SCHEMA_VERSION_V2,
  EXECUTION_SCHEMA_VERSION_V3,
} from '@/lib/attestations/executionReceipt';

export const ExecutionVerifyBodySchema = z.object({
  attestation: z
    .object({
      uid: z.string(),
      schemaVersion: z.union([
        z.literal(EXECUTION_SCHEMA_VERSION),
        z.literal(EXECUTION_SCHEMA_VERSION_V2),
        z.literal(EXECUTION_SCHEMA_VERSION_V3),
      ]),
      attester: z.string(),
      signature: z.string(),
      data: z.record(z.string(), z.unknown()),
    })
    // Extra fields (notably the informational `eip712` block) are carried but
    // never trusted: routing is by schemaVersion alone.
    .passthrough(),
});

export type ExecutionVerifyBody = z.infer<typeof ExecutionVerifyBodySchema>;
