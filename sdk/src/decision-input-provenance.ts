import { keccak256, toBytes } from 'viem';

import { canonicalJson } from './canonical-json';

export const DECISION_INPUT_QUOTE_PROVENANCE_SCHEMA_VERSION = 1 as const;

export type DecisionInputEvidenceRightsScope =
  | 'synthetic'
  | 'onchain'
  | 'customer-authorized'
  | 'vendor-licensed'
  | 'research-quarantined';

export interface DecisionInputQuoteProvenance {
  schemaVersion: typeof DECISION_INPUT_QUOTE_PROVENANCE_SCHEMA_VERSION;
  sourceId: string;
  rightsScope: DecisionInputEvidenceRightsScope;
  captureMethod: 'client-held' | 'onchain-read';
  asset: string;
  chainId: number;
  quotePriceUsd: number;
  observedAt: string;
  requestHash: `0x${string}`;
  responseHash: `0x${string}`;
}

export interface CreateDecisionInputQuoteProvenanceInput {
  sourceId: string;
  rightsScope: DecisionInputEvidenceRightsScope;
  captureMethod?: DecisionInputQuoteProvenance['captureMethod'];
  asset: string;
  chainId: number;
  quotePriceUsd: number;
  observedAt: string;
  /** Stays local; only its canonical hash is returned. */
  request: unknown;
  /** Stays local; only its canonical hash is returned. */
  response: unknown;
}

function hashCanonical(value: unknown): `0x${string}` {
  return keccak256(toBytes(canonicalJson(value)));
}

function timestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

const RIGHTS_SCOPES = new Set<DecisionInputEvidenceRightsScope>([
  'synthetic',
  'onchain',
  'customer-authorized',
  'vendor-licensed',
  'research-quarantined',
]);

/**
 * Create a portable, hash-only envelope around data retained by the caller.
 * It proves only the caller's retained bytes match these digests; it does not
 * authenticate the upstream provider or grant rights to redistribute its data.
 */
export function createDecisionInputQuoteProvenance(
  input: CreateDecisionInputQuoteProvenanceInput
): DecisionInputQuoteProvenance {
  if (!/^[A-Za-z0-9_.:-]{1,160}$/.test(input.sourceId)) {
    throw new TypeError('sourceId must be a non-empty safe identifier');
  }
  if (!RIGHTS_SCOPES.has(input.rightsScope))
    throw new TypeError('Unsupported evidence rights scope');
  if (!/^[A-Za-z0-9_.:-]{1,80}$/.test(input.asset.trim())) {
    throw new TypeError('asset must be a non-empty safe identifier');
  }
  if (!Number.isSafeInteger(input.chainId) || input.chainId < 0) {
    throw new TypeError('chainId must be a non-negative integer');
  }
  if (!Number.isFinite(input.quotePriceUsd) || input.quotePriceUsd <= 0) {
    throw new TypeError('quotePriceUsd must be a positive finite number');
  }
  if (!timestamp(input.observedAt))
    throw new TypeError('observedAt must be an offset-qualified ISO timestamp');
  return {
    schemaVersion: DECISION_INPUT_QUOTE_PROVENANCE_SCHEMA_VERSION,
    sourceId: input.sourceId,
    rightsScope: input.rightsScope,
    captureMethod: input.captureMethod ?? 'client-held',
    asset: input.asset.trim().toUpperCase(),
    chainId: input.chainId,
    quotePriceUsd: input.quotePriceUsd,
    observedAt: input.observedAt,
    requestHash: hashCanonical(input.request),
    responseHash: hashCanonical(input.response),
  };
}

export function isDecisionInputQuoteProvenance(
  value: unknown
): value is DecisionInputQuoteProvenance {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    item.schemaVersion === DECISION_INPUT_QUOTE_PROVENANCE_SCHEMA_VERSION &&
    typeof item.sourceId === 'string' &&
    /^[A-Za-z0-9_.:-]{1,160}$/.test(item.sourceId) &&
    typeof item.rightsScope === 'string' &&
    RIGHTS_SCOPES.has(item.rightsScope as DecisionInputEvidenceRightsScope) &&
    (item.captureMethod === 'client-held' || item.captureMethod === 'onchain-read') &&
    typeof item.asset === 'string' &&
    /^[A-Za-z0-9_.:-]{1,80}$/.test(item.asset.trim()) &&
    Number.isSafeInteger(item.chainId) &&
    Number(item.chainId) >= 0 &&
    typeof item.quotePriceUsd === 'number' &&
    Number.isFinite(item.quotePriceUsd) &&
    item.quotePriceUsd > 0 &&
    timestamp(item.observedAt) &&
    typeof item.requestHash === 'string' &&
    /^0x[0-9a-fA-F]{64}$/.test(item.requestHash) &&
    typeof item.responseHash === 'string' &&
    /^0x[0-9a-fA-F]{64}$/.test(item.responseHash)
  );
}

export function quoteProvenanceMatchesInput(
  provenance: DecisionInputQuoteProvenance,
  input: { asset: string; chainId: number; quotePriceUsd: number; quoteObservedAt: string }
): boolean {
  return (
    provenance.asset.trim().toUpperCase() === input.asset.trim().toUpperCase() &&
    provenance.chainId === input.chainId &&
    provenance.quotePriceUsd === input.quotePriceUsd &&
    provenance.observedAt === input.quoteObservedAt
  );
}
