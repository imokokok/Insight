import { hashTypedData, keccak256, toBytes } from 'viem';

import { getAttesterAccount } from '@/lib/attestations/attesterAccount';

export const POLYMARKET_ASSESSMENT_DOMAIN = {
  name: 'Insight Polymarket Market Assessment',
  version: '1',
  chainId: 1,
} as const;
export const POLYMARKET_ASSESSMENT_TYPES = {
  PolymarketMarketAssessment: [
    { name: 'assessmentHash', type: 'bytes32' },
    { name: 'marketId', type: 'string' },
    { name: 'outcome', type: 'string' },
    { name: 'verdict', type: 'uint8' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;
export const POLYMARKET_ASSESSMENT_ATTESTATION_SCHEMA =
  'insight.polymarket-market-assessment-attestation.v1' as const;
export const POLYMARKET_ASSESSMENT_VALID_FOR_SECONDS = 60;

function canonical(value: unknown, depth = 0): string {
  if (depth > 48) throw new TypeError('Assessment exceeds canonical JSON depth');
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item, depth + 1)).join(',')}]`;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const object = value as Record<string, unknown>;
    const keys = Object.keys(object).sort();
    if (keys.some((key) => ['__proto__', 'constructor', 'prototype'].includes(key)))
      throw new TypeError('Assessment has unsafe JSON property');
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(object[key], depth + 1)}`).join(',')}}`;
  }
  throw new TypeError('Assessment is not canonical JSON');
}

/** Sign a short-lived, read-only market assessment. Signing is additive and never changes its verdict. */
export async function attestPolymarketMarketAssessment(assessment: Record<string, unknown>) {
  const account = await getAttesterAccount();
  if (!account) return null;
  const market = assessment.market as Record<string, unknown> | undefined;
  const outcome = assessment.outcome as Record<string, unknown> | undefined;
  if (
    assessment.schema !== 'insight.polymarket-market-assessment.v1' ||
    typeof market?.id !== 'string' ||
    typeof outcome?.name !== 'string' ||
    !['ALLOW', 'CAUTION', 'BLOCK'].includes(String(assessment.verdict))
  )
    throw new TypeError('Malformed Polymarket assessment for attestation');
  const assessmentHash = keccak256(toBytes(canonical(assessment)));
  const issuedAt = Math.floor(Date.now() / 1000);
  const validUntil = issuedAt + POLYMARKET_ASSESSMENT_VALID_FOR_SECONDS;
  const verdict = assessment.verdict === 'ALLOW' ? 0 : assessment.verdict === 'CAUTION' ? 1 : 2;
  const message = {
    assessmentHash,
    marketId: market.id,
    outcome: outcome.name,
    verdict,
    issuedAt: BigInt(issuedAt),
    validUntil: BigInt(validUntil),
    schemaVersion: 1n,
  };
  const typedData = {
    domain: POLYMARKET_ASSESSMENT_DOMAIN,
    types: POLYMARKET_ASSESSMENT_TYPES,
    primaryType: 'PolymarketMarketAssessment' as const,
    message,
  };
  const signature = await account.signTypedData(typedData);
  return {
    schema: POLYMARKET_ASSESSMENT_ATTESTATION_SCHEMA,
    decisionHash: assessmentHash,
    attestation: {
      type: 'PolymarketMarketAssessment' as const,
      schemaVersion: 1 as const,
      uid: hashTypedData(typedData),
      attester: account.address,
      signedAt: new Date(issuedAt * 1000).toISOString(),
      validForSeconds: POLYMARKET_ASSESSMENT_VALID_FOR_SECONDS,
      signature,
      data: {
        assessmentHash,
        marketId: market.id,
        outcome: outcome.name,
        verdict,
        issuedAt,
        validUntil,
        schemaVersion: 1,
      },
      eip712: {
        domain: POLYMARKET_ASSESSMENT_DOMAIN,
        types: POLYMARKET_ASSESSMENT_TYPES,
        primaryType: 'PolymarketMarketAssessment',
      },
    },
  };
}
