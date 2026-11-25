import { hashTypedData, keccak256, toBytes, verifyTypedData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { getAttesterAccount } from '@/lib/attestations/attesterAccount';

import {
  attestPolymarketSourceEvidence,
  POLYMARKET_SOURCE_EVIDENCE_DOMAIN,
  POLYMARKET_SOURCE_EVIDENCE_TYPES,
} from './polymarketEvidenceAttestation';

jest.mock('@/lib/attestations/attesterAccount', () => ({
  getAttesterAccount: jest.fn(),
}));

const signer = privateKeyToAccount(`0x${'46'.repeat(32)}` as `0x${string}`);
const evidence = {
  schema: 'insight.polymarket-source-evidence.v1',
  collectedAt: '2026-11-25T12:00:00.000Z',
  market: { id: 'market-1' },
};

function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
    .join(',')}}`;
}

describe('Polymarket source-evidence attestation', () => {
  beforeEach(() => {
    (getAttesterAccount as jest.Mock).mockResolvedValue({
      address: signer.address,
      signTypedData: signer.signTypedData,
    });
  });

  it('signs the exact record and binds the market ID for five minutes', async () => {
    const attestation = await attestPolymarketSourceEvidence(evidence);
    expect(attestation?.schema).toBe('insight.polymarket-source-evidence-attestation.v1');
    expect(attestation?.decisionHash).toBe(keccak256(toBytes(canonical(evidence))));
    const signed = attestation!.attestation;
    expect(signed.data.marketId).toBe('market-1');
    expect(signed.validForSeconds).toBe(300);
    const typedData = {
      domain: POLYMARKET_SOURCE_EVIDENCE_DOMAIN,
      types: POLYMARKET_SOURCE_EVIDENCE_TYPES,
      primaryType: 'PolymarketSourceEvidence' as const,
      message: {
        evidenceHash: signed.data.evidenceHash,
        marketId: signed.data.marketId,
        issuedAt: BigInt(signed.data.issuedAt),
        validUntil: BigInt(signed.data.validUntil),
        schemaVersion: 1n,
      },
    };
    expect(hashTypedData(typedData)).toBe(signed.uid);
    await expect(
      verifyTypedData({ ...typedData, address: signer.address, signature: signed.signature })
    ).resolves.toBe(true);
  });

  it('fails closed when the signing key is unavailable and rejects an invalid record', async () => {
    (getAttesterAccount as jest.Mock).mockResolvedValue(null);
    await expect(attestPolymarketSourceEvidence(evidence)).resolves.toBeNull();
    await expect(
      attestPolymarketSourceEvidence({ schema: 'wrong', market: { id: 'market-1' } })
    ).rejects.toThrow('Malformed');
  });
});
