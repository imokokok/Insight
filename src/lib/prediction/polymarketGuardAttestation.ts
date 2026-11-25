/** Portable, short-lived signature for Insight's read-only Polymarket screen.
 * The signature binds the complete assessment payload; it grants no order or
 * transaction authority and makes no claim about the truth of an event. */

import { hashTypedData, keccak256, toBytes } from 'viem';

import {
  getAttesterAccount,
  getAttesterAddress,
  getSampleAttesterAddress,
} from '@/lib/attestations/attesterAccount';
import { buildKeyRegistryConfig, trustedAttesterEntry } from '@/lib/attestations/keyRegistryConfig';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';
import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import { POLYMARKET_GUARD_SCHEMA_VERSION, type PolymarketGuardResult } from './polymarketGuard';

const logger = createLogger('PolymarketGuardAttestation');

export const POLYMARKET_GUARD_DECISION_SCHEMA = 'insight.polymarket-guard-decision.v1' as const;
export const POLYMARKET_GUARD_ATTESTATION_SCHEMA_VERSION = 1 as const;
export const POLYMARKET_GUARD_ATTESTATION_VALID_FOR_SECONDS = 60;
export const POLYMARKET_GUARD_ATTESTATION_PRIMARY_TYPE = 'PolymarketGuardDecision' as const;
export const POLYMARKET_GUARD_ATTESTATION_DOMAIN = {
  name: 'Insight Polymarket Guard',
  version: '1',
  chainId: 1,
} as const;
export const POLYMARKET_GUARD_ATTESTATION_TYPES = {
  PolymarketGuardDecision: [
    { name: 'assessmentHash', type: 'bytes32' },
    { name: 'protocolId', type: 'string' },
    { name: 'marketSlug', type: 'string' },
    { name: 'action', type: 'string' },
    { name: 'verdict', type: 'uint8' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

export type PolymarketGuardAttestationData = {
  assessmentHash: `0x${string}`;
  protocolId: 'polymarket-prediction-mainnet';
  marketSlug: string;
  action: 'buy_up' | 'buy_down';
  verdict: 0 | 1 | 2;
  issuedAt: number;
  validUntil: number;
  schemaVersion: typeof POLYMARKET_GUARD_ATTESTATION_SCHEMA_VERSION;
};

export type PolymarketGuardAttestation = {
  type: typeof POLYMARKET_GUARD_ATTESTATION_PRIMARY_TYPE;
  schemaVersion: typeof POLYMARKET_GUARD_ATTESTATION_SCHEMA_VERSION;
  uid: `0x${string}`;
  attester: `0x${string}`;
  attesterLabel: 'Insight Polymarket Guard attester';
  signedAt: string;
  validForSeconds: typeof POLYMARKET_GUARD_ATTESTATION_VALID_FOR_SECONDS;
  signature: `0x${string}`;
  data: PolymarketGuardAttestationData;
  eip712: Record<string, unknown>;
};

export type PolymarketGuardDecision = {
  schema: typeof POLYMARKET_GUARD_DECISION_SCHEMA;
  guard: PolymarketGuardResult;
  decisionHash: `0x${string}`;
  attestation: PolymarketGuardAttestation;
};

export type PolymarketGuardAttestationDependencies = {
  signer?: Awaited<ReturnType<typeof getAttesterAccount>>;
  now?: () => number;
  trustAttester?: (address: string, issuedAt: number) => Promise<boolean>;
};

export function polymarketGuardAssessmentHash(guard: PolymarketGuardResult): `0x${string}` {
  return keccak256(toBytes(canonicalJsonString(guard)));
}

export function polymarketGuardAttestationTypedData(data: PolymarketGuardAttestationData) {
  return {
    domain: POLYMARKET_GUARD_ATTESTATION_DOMAIN,
    types: POLYMARKET_GUARD_ATTESTATION_TYPES,
    primaryType: POLYMARKET_GUARD_ATTESTATION_PRIMARY_TYPE,
    message: {
      ...data,
      issuedAt: BigInt(data.issuedAt),
      validUntil: BigInt(data.validUntil),
      schemaVersion: BigInt(data.schemaVersion),
    },
  } as const;
}

export async function attestPolymarketGuardResult(
  guard: PolymarketGuardResult,
  dependencies: PolymarketGuardAttestationDependencies = {}
): Promise<PolymarketGuardDecision | null> {
  if (
    guard.schema !== POLYMARKET_GUARD_SCHEMA_VERSION ||
    guard.protocolId !== 'polymarket-prediction-mainnet' ||
    guard.scope.transactionAuthority !== 'none' ||
    !guard.market.marketSlug ||
    !Number.isSafeInteger(guard.timing.evaluatedAtMs)
  ) {
    throw new TypeError('Polymarket guard result is outside the signed read-only schema');
  }

  const signer =
    dependencies.signer === undefined ? await getAttesterAccount() : dependencies.signer;
  if (!signer) return null;

  const issuedAt = (dependencies.now ?? nowInSeconds)();
  const assessedAt = Math.floor(guard.timing.evaluatedAtMs / 1000);
  const validUntil = Math.min(
    issuedAt + POLYMARKET_GUARD_ATTESTATION_VALID_FOR_SECONDS,
    assessedAt + POLYMARKET_GUARD_ATTESTATION_VALID_FOR_SECONDS
  );
  if (issuedAt < assessedAt || validUntil <= issuedAt) return null;

  const trustAttester = dependencies.trustAttester ?? isPublishedPolymarketGuardAttester;
  if (!(await trustAttester(signer.address, issuedAt))) {
    logger.warn('Polymarket guard signer is outside the published production key registry', {
      attester: signer.address,
    });
    return null;
  }

  const data: PolymarketGuardAttestationData = {
    assessmentHash: polymarketGuardAssessmentHash(guard),
    protocolId: guard.protocolId,
    marketSlug: guard.market.marketSlug,
    action: guard.action,
    verdict: verdictCode(guard.verdict),
    issuedAt,
    validUntil,
    schemaVersion: POLYMARKET_GUARD_ATTESTATION_SCHEMA_VERSION,
  };
  const typedData = polymarketGuardAttestationTypedData(data);
  const signature = await signer.signTypedData(typedData);
  return {
    schema: POLYMARKET_GUARD_DECISION_SCHEMA,
    guard,
    decisionHash: data.assessmentHash,
    attestation: {
      type: POLYMARKET_GUARD_ATTESTATION_PRIMARY_TYPE,
      schemaVersion: POLYMARKET_GUARD_ATTESTATION_SCHEMA_VERSION,
      uid: hashTypedData(typedData),
      attester: signer.address.toLowerCase() as `0x${string}`,
      attesterLabel: 'Insight Polymarket Guard attester',
      signedAt: new Date(issuedAt * 1000).toISOString(),
      validForSeconds: POLYMARKET_GUARD_ATTESTATION_VALID_FOR_SECONDS,
      signature: signature as `0x${string}`,
      data,
      eip712: {
        domain: POLYMARKET_GUARD_ATTESTATION_DOMAIN,
        types: POLYMARKET_GUARD_ATTESTATION_TYPES,
        primaryType: POLYMARKET_GUARD_ATTESTATION_PRIMARY_TYPE,
      },
    },
  };
}

export async function isPublishedPolymarketGuardAttester(
  address: string,
  issuedAt: number
): Promise<boolean> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return false;
  const config = buildKeyRegistryConfig(
    await getAttesterAddress(),
    await getSampleAttesterAddress()
  );
  return trustedAttesterEntry(address, issuedAt, config) !== null;
}

function verdictCode(verdict: PolymarketGuardResult['verdict']): 0 | 1 | 2 {
  if (verdict === 'ALLOW') return 0;
  if (verdict === 'CAUTION') return 1;
  return 2;
}
