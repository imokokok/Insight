import { z } from 'zod';

import {
  EvidenceRightsScopeSchema,
  evidenceRightsPermit,
  type EvidenceUse,
} from '@/lib/dataRights/evidenceRights';
import { DecisionInputQuoteTimestampSchema } from '@/lib/decisionInputTrust/validation';

const Bytes32Schema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const SourceIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9_.:-]+$/);
const AssetSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9_.:-]+$/);

/**
 * Hash-only quote provenance. Raw upstream requests and responses remain with
 * the caller; this object cannot itself reconstruct, redistribute, or display
 * a third-party market-data payload.
 */
export const DecisionInputQuoteProvenanceSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceId: SourceIdSchema,
    rightsScope: EvidenceRightsScopeSchema,
    captureMethod: z.enum(['client-held', 'onchain-read']),
    asset: AssetSchema,
    chainId: z.number().int().nonnegative(),
    quotePriceUsd: z.number().finite().positive(),
    observedAt: DecisionInputQuoteTimestampSchema,
    requestHash: Bytes32Schema,
    responseHash: Bytes32Schema,
  })
  .strict();

export type DecisionInputQuoteProvenance = z.infer<typeof DecisionInputQuoteProvenanceSchema>;

export function quoteProvenanceMatchesQuote(
  provenance: DecisionInputQuoteProvenance,
  quote: { asset: string; chainId: number; quotePriceUsd: number; quoteObservedAt: string }
): boolean {
  return (
    provenance.asset.trim().toUpperCase() === quote.asset.trim().toUpperCase() &&
    provenance.chainId === quote.chainId &&
    provenance.quotePriceUsd === quote.quotePriceUsd &&
    provenance.observedAt === quote.quoteObservedAt
  );
}

export function usableQuoteProvenance(
  value: unknown,
  quote: { asset: string; chainId: number; quotePriceUsd: number; quoteObservedAt: string },
  use: EvidenceUse
): { provenance: DecisionInputQuoteProvenance | null; reason: string | null } {
  const parsed = DecisionInputQuoteProvenanceSchema.safeParse(value);
  if (!parsed.success) return { provenance: null, reason: 'malformed' };
  if (!quoteProvenanceMatchesQuote(parsed.data, quote)) {
    return { provenance: null, reason: 'binding_mismatch' };
  }
  if (!evidenceRightsPermit(parsed.data.rightsScope, use)) {
    return { provenance: null, reason: 'rights_not_permitted' };
  }
  return { provenance: parsed.data, reason: null };
}
