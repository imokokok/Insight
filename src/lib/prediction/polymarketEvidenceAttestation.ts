import { hashTypedData, keccak256, toBytes } from 'viem';

import { getAttesterAccount } from '@/lib/attestations/attesterAccount';

export const POLYMARKET_SOURCE_EVIDENCE_DOMAIN = {
  name: 'Insight Polymarket Source Evidence',
  version: '1',
  chainId: 1,
} as const;
export const POLYMARKET_SOURCE_EVIDENCE_TYPES = {
  PolymarketSourceEvidence: [
    { name: 'evidenceHash', type: 'bytes32' },
    { name: 'marketId', type: 'string' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;
export const POLYMARKET_SOURCE_EVIDENCE_ATTESTATION_SCHEMA =
  'insight.polymarket-source-evidence-attestation.v1' as const;
export const POLYMARKET_SOURCE_EVIDENCE_VALID_FOR_SECONDS = 300;

function canonical(value: unknown, depth = 0): string {
  if (depth > 48) throw new TypeError('Evidence exceeds canonical JSON depth');
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item, depth + 1)).join(',')}]`;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const object = value as Record<string, unknown>;
    const keys = Object.keys(object).sort();
    if (keys.some((key) => ['__proto__', 'constructor', 'prototype'].includes(key)))
      throw new TypeError('Evidence has unsafe JSON property');
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(object[key], depth + 1)}`).join(',')}}`;
  }
  throw new TypeError('Evidence is not canonical JSON');
}

/** Sign the exact source-evidence record after collection; absent signing keys fail closed. */
export async function attestPolymarketSourceEvidence(evidence: Record<string, unknown>) {
  const market = evidence.market as Record<string, unknown> | undefined;
  if (
    evidence.schema !== 'insight.polymarket-source-evidence.v1' ||
    typeof market?.id !== 'string' ||
    !market.id
  )
    throw new TypeError('Malformed Polymarket source evidence for attestation');
  const account = await getAttesterAccount();
  if (!account) return null;

  const evidenceHash = keccak256(toBytes(canonical(evidence)));
  const issuedAt = Math.floor(Date.now() / 1000);
  const validUntil = issuedAt + POLYMARKET_SOURCE_EVIDENCE_VALID_FOR_SECONDS;
  const typedData = {
    domain: POLYMARKET_SOURCE_EVIDENCE_DOMAIN,
    types: POLYMARKET_SOURCE_EVIDENCE_TYPES,
    primaryType: 'PolymarketSourceEvidence' as const,
    message: {
      evidenceHash,
      marketId: market.id,
      issuedAt: BigInt(issuedAt),
      validUntil: BigInt(validUntil),
      schemaVersion: 1n,
    },
  };
  return {
    schema: POLYMARKET_SOURCE_EVIDENCE_ATTESTATION_SCHEMA,
    decisionHash: evidenceHash,
    attestation: {
      type: 'PolymarketSourceEvidence' as const,
      schemaVersion: 1 as const,
      uid: hashTypedData(typedData),
      attester: account.address,
      signedAt: new Date(issuedAt * 1000).toISOString(),
      validForSeconds: POLYMARKET_SOURCE_EVIDENCE_VALID_FOR_SECONDS,
      signature: await account.signTypedData(typedData),
      data: {
        evidenceHash,
        marketId: market.id,
        issuedAt,
        validUntil,
        schemaVersion: 1,
      },
      eip712: {
        domain: POLYMARKET_SOURCE_EVIDENCE_DOMAIN,
        types: POLYMARKET_SOURCE_EVIDENCE_TYPES,
        primaryType: 'PolymarketSourceEvidence',
      },
    },
  };
}
