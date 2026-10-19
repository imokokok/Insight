import {
  HEADLESS_H4_ISSUER_PROFILE_FORMAT,
  buildHeadlessH4IssuerProfile,
  headlessH4IssuerProfileSha256,
  serializeHeadlessH4IssuerProfile,
} from '../headlessH4IssuerProfile';

const activeKey = {
  key_id: 'insight-prod-1',
  public_key: '0x1111111111111111111111111111111111111111',
  algorithm: 'EIP-712/secp256k1' as const,
  validFrom: '2026-10-01T00:00:00.000Z',
  validUntil: null,
  revoked: false,
  role: 'attester' as const,
};

describe('Headless H4 issuer profile', () => {
  it('maps raw Insight v3 envelopes and the published key document without activating a partner path', async () => {
    const profile = buildHeadlessH4IssuerProfile({
      issuerOrigin: 'https://www.oracleinsight.xyz',
      publicKeys: [
        activeKey,
        {
          ...activeKey,
          key_id: 'sample',
          public_key: '0x2222222222222222222222222222222222222222',
          role: 'sample',
        },
        {
          ...activeKey,
          key_id: 'revoked',
          public_key: '0x3333333333333333333333333333333333333333',
          revoked: true,
        },
      ],
    });

    expect(profile.format).toBe(HEADLESS_H4_ISSUER_PROFILE_FORMAT);
    expect(profile.chain_id).toBe(8453);
    expect(profile.test).toBe(false);
    expect(profile.signers).toEqual([{
      address: activeKey.public_key,
      key_id: activeKey.key_id,
      valid_from: activeKey.validFrom,
      valid_until: null,
    }]);
    expect(profile.receipt.eip712.primaryType).toBe('OracleSafetyCheck');
    expect(profile.receipt.fields).toEqual({
      checked_at: 'checkedAt',
      valid_until: 'validUntil',
      request_hash: 'requestHash',
      verdict: 'verdict',
      schema_version: 'schemaVersion',
    });
    expect(profile.envelope.required).toContain('eip712');
    expect(profile.envelope).not.toHaveProperty('layout');
    expect(profile.key_document).toEqual(expect.objectContaining({
      url: 'https://www.oracleinsight.xyz/.well-known/oracle-keys.json',
      keys: 'public_keys',
      valid_from: 'validFrom',
      valid_until: 'validUntil',
      layout: 'schemas.OracleSafetyCheck.eip712',
    }));

    const serialized = serializeHeadlessH4IssuerProfile(profile);
    expect(serialized.endsWith('\n')).toBe(true);
    expect(headlessH4IssuerProfileSha256(profile)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses unsafe origins and an empty active-production signer set', () => {
    expect(() => buildHeadlessH4IssuerProfile({
      issuerOrigin: 'http://www.oracleinsight.xyz',
      publicKeys: [activeKey],
    })).toThrow('bare HTTPS origin');
    expect(() => buildHeadlessH4IssuerProfile({
      issuerOrigin: 'https://www.oracleinsight.xyz',
      publicKeys: [{ ...activeKey, revoked: true }],
    })).toThrow('at least one active production attester key');
  });
});
