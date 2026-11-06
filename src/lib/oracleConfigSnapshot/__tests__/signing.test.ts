import { privateKeyToAccount } from 'viem/accounts';

import { SETTLEMENT_EVIDENCE_DOMAIN } from '@/lib/settlementEvidence/signing';

import { buildPayload, canonicalJson, computePayloadHash } from '../engine';
import {
  buildOracleConfigSnapshotMessage,
  ORACLE_CONFIG_SNAPSHOT_DOMAIN,
  signOracleConfigSnapshot,
  verifyOracleConfigSnapshot,
} from '../signing';

import type { AttesterAccount } from '@/lib/attestations/attesterAccount';
import type { OracleConfigSources } from '../types';

const input = { chainId: 8453, protocolId: 'moonwell-iv2-base', assetSymbol: 'USDC' };

const sources: OracleConfigSources = {
  providers: ['chainlink', 'pyth'],
  nonDerivedGroups: 2,
  feed: null,
  profile: null,
  feedRegistryErrored: false,
  registryPin: 'b'.repeat(64),
};

function testSigner(): AttesterAccount {
  const account = privateKeyToAccount(`0x${'11'.repeat(32)}`);
  return {
    address: account.address,
    signTypedData: (args: unknown) =>
      account.signTypedData(args as Parameters<typeof account.signTypedData>[0]),
  };
}

describe('oracle config snapshot signing', () => {
  it('uses a distinct EIP-712 domain so receipts cannot be replayed', () => {
    expect(ORACLE_CONFIG_SNAPSHOT_DOMAIN.name).not.toBe(SETTLEMENT_EVIDENCE_DOMAIN.name);
  });

  it('signs and independently verifies a snapshot', async () => {
    const bucket = 1_800_000_000_000;
    const payload = buildPayload(input, sources, bucket, bucket);
    const payloadHash = computePayloadHash(payload);
    const attestation = await signOracleConfigSnapshot(payload, payloadHash, testSigner());

    expect(attestation).not.toBeNull();
    if (!attestation) throw new Error('expected an attestation');
    expect(attestation.eip712.domain.name).toBe(ORACLE_CONFIG_SNAPSHOT_DOMAIN.name);
    expect(attestation).not.toHaveProperty('validForSeconds');

    const result = await verifyOracleConfigSnapshot(payload, payloadHash, attestation);
    expect(result.valid).toBe(true);
    expect(result.attester.toLowerCase()).toBe(attestation.attester.toLowerCase());
  });

  it('detects tampering with the check record', async () => {
    const bucket = 1_800_000_000_000;
    const payload = buildPayload(input, sources, bucket, bucket);
    const payloadHash = computePayloadHash(payload);
    const attestation = await signOracleConfigSnapshot(payload, payloadHash, testSigner());
    if (!attestation) throw new Error('expected an attestation');

    const tampered = { ...payload, reasonCodes: ['TAMPERED'] };
    const result = await verifyOracleConfigSnapshot(tampered, payloadHash, attestation);
    expect(result.valid).toBe(false);
  });

  it('rejects an altered payload even when the caller recomputes its hash', async () => {
    const bucket = 1_800_000_000_000;
    const payload = buildPayload(input, sources, bucket, bucket);
    const payloadHash = computePayloadHash(payload);
    const attestation = await signOracleConfigSnapshot(payload, payloadHash, testSigner());
    if (!attestation) throw new Error('expected an attestation');

    const altered = { ...payload, reasonCodes: ['ALTERED'] };
    const result = await verifyOracleConfigSnapshot(
      altered,
      computePayloadHash(altered),
      attestation
    );
    expect(result.valid).toBe(false);
  });

  it('the signed message binds configHash, checksHash, payloadHash and the registry pin', () => {
    const bucket = 1_800_000_000_000;
    const payload = buildPayload(input, sources, bucket, bucket);
    const message = buildOracleConfigSnapshotMessage(payload, computePayloadHash(payload));
    expect(message.configHash).toBe(`0x${payload.configHash}`);
    expect(message.registryPin).toBe(`0x${sources.registryPin}`);
    expect(canonicalJson(payload)).toContain(payload.configHash);
  });
});
