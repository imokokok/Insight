/**
 * EIP-712 attestation for oracle config snapshots.
 *
 * Distinct domain name prevents a snapshot signature from being replayed on
 * the settlement-evidence, pre-trade, Oracle Watch or scenario-test surfaces.
 *
 * Unlike the short-lived gate attestations, a snapshot is a HISTORICAL record:
 * the signed message carries observedAt / bucketStart and deliberately has NO
 * validUntil. A holder can verify it years later against the published
 * attester and the pinned reviewed-profile registry. Field order is FROZEN
 * for schemaVersion 1.
 *
 * A missing attester key means "attestation unavailable", never a different
 * record. The payload is unchanged and `attested` is reported as false.
 */

import { getAttesterAccount, type AttesterAccount } from '@/lib/attestations/attesterAccount';
import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import type { OracleConfigAttestation, OracleConfigSnapshotPayload } from './types';
import { ORACLE_CONFIG_SNAPSHOT_SCHEMA_VERSION } from './types';

const logger = createLogger('OracleConfigSnapshotSigning');

export const ORACLE_CONFIG_SNAPSHOT_DOMAIN = {
  name: 'Insight Oracle Config Snapshot',
  version: '1',
  chainId: 1,
} as const;

export const ORACLE_CONFIG_SNAPSHOT_PRIMARY_TYPE = 'OracleConfigSnapshot';

/** v1 type layout, FROZEN. */
export const ORACLE_CONFIG_SNAPSHOT_TYPES = {
  OracleConfigSnapshot: [
    { name: 'configHash', type: 'bytes32' },
    { name: 'checksHash', type: 'bytes32' },
    { name: 'payloadHash', type: 'bytes32' },
    { name: 'chainId', type: 'uint256' },
    { name: 'protocolId', type: 'string' },
    { name: 'assetSymbol', type: 'string' },
    { name: 'registryPin', type: 'bytes32' },
    { name: 'observedAt', type: 'uint256' },
    { name: 'bucketStart', type: 'uint256' },
    { name: 'gateResult', type: 'string' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

export interface OracleConfigSnapshotMessage {
  configHash: `0x${string}`;
  checksHash: `0x${string}`;
  payloadHash: `0x${string}`;
  chainId: bigint;
  protocolId: string;
  assetSymbol: string;
  registryPin: `0x${string}`;
  observedAt: bigint;
  bucketStart: bigint;
  gateResult: string;
  schemaVersion: bigint;
}

function toBytes32(hex: string): `0x${string}` {
  return `0x${hex.replace(/^0x/, '')}` as `0x${string}`;
}

export function buildOracleConfigSnapshotMessage(
  payload: OracleConfigSnapshotPayload,
  payloadHash: string
): OracleConfigSnapshotMessage {
  return {
    configHash: toBytes32(payload.configHash),
    checksHash: toBytes32(payload.checksHash),
    payloadHash: toBytes32(payloadHash),
    chainId: BigInt(payload.chainId),
    protocolId: payload.protocolId,
    assetSymbol: payload.assetSymbol,
    registryPin: toBytes32(payload.registryPin),
    observedAt: BigInt(Math.floor(payload.observedAtMs / 1000)),
    bucketStart: BigInt(Math.floor(payload.bucketStartMs / 1000)),
    gateResult: payload.gateResult,
    schemaVersion: BigInt(ORACLE_CONFIG_SNAPSHOT_SCHEMA_VERSION),
  };
}

export function typedDataArgs(message: OracleConfigSnapshotMessage) {
  return {
    domain: ORACLE_CONFIG_SNAPSHOT_DOMAIN,
    types: ORACLE_CONFIG_SNAPSHOT_TYPES,
    primaryType: ORACLE_CONFIG_SNAPSHOT_PRIMARY_TYPE,
    message,
  } as const;
}

/** Sign a snapshot. Returns null when no attester key is configured. */
export async function signOracleConfigSnapshot(
  payload: OracleConfigSnapshotPayload,
  payloadHash: string,
  account?: AttesterAccount | null
): Promise<OracleConfigAttestation | null> {
  const signer = account ?? (await getAttesterAccount());
  if (!signer) return null;
  try {
    const { hashTypedData } = await import('viem');
    const signedAtSeconds = nowInSeconds();
    const args = typedDataArgs(buildOracleConfigSnapshotMessage(payload, payloadHash));
    const signature = await signer.signTypedData(args);
    const uid = hashTypedData(args);
    return {
      uid,
      schemaVersion: ORACLE_CONFIG_SNAPSHOT_SCHEMA_VERSION,
      attester: signer.address,
      attesterLabel: 'Insight Oracle Config Snapshot attester',
      signedAt: new Date(signedAtSeconds * 1000).toISOString(),
      signature,
      eip712: {
        domain: { ...ORACLE_CONFIG_SNAPSHOT_DOMAIN },
        primaryType: ORACLE_CONFIG_SNAPSHOT_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign oracle config snapshot', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export interface OracleConfigSnapshotVerificationResult {
  valid: boolean;
  attester: string;
  reason?: string;
}

/**
 * Independent recomputation: re-hash the canonical payload, rebuild the typed
 * data, recover the signer and compare it with the claimed attester.
 */
export async function verifyOracleConfigSnapshot(
  payload: OracleConfigSnapshotPayload,
  payloadHash: string,
  attestation: OracleConfigAttestation
): Promise<OracleConfigSnapshotVerificationResult> {
  const { recoverTypedDataAddress, hashTypedData } = await import('viem');
  const args = typedDataArgs(buildOracleConfigSnapshotMessage(payload, payloadHash));
  try {
    const recovered = await recoverTypedDataAddress({
      ...args,
      signature: attestation.signature as `0x${string}`,
    });
    const valid =
      recovered.toLowerCase() === attestation.attester.toLowerCase() &&
      hashTypedData(args) === attestation.uid;
    return {
      valid,
      attester: recovered,
      ...(valid ? {} : { reason: 'Signer or typed-data hash does not match the attestation.' }),
    };
  } catch (error) {
    return {
      valid: false,
      attester: attestation.attester,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
