import {
  buildKeyRegistryConfig,
  enforceAttestationKeyTrust,
  isAttestationKeyValid,
  trustedAttesterEntry,
  type KeyRegistryConfig,
} from '../keyRegistryConfig';

const ADDRESS = '0x1111111111111111111111111111111111111111';

function registry(role: 'attester' | 'sample' = 'attester'): KeyRegistryConfig {
  return {
    keys: [
      {
        key_id: 'test',
        public_key: ADDRESS,
        algorithm: 'EIP-712/secp256k1',
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2027-01-01T00:00:00.000Z',
        revoked: false,
        role,
      },
    ],
    revoked: [],
  };
}

describe('key registry time and role enforcement', () => {
  const originalKeys = process.env.ATTESTATION_KEYS_CONFIG;
  const originalRevoked = process.env.ATTESTATION_REVOKED_KEYS_CONFIG;

  afterEach(() => {
    if (originalKeys === undefined) delete process.env.ATTESTATION_KEYS_CONFIG;
    else process.env.ATTESTATION_KEYS_CONFIG = originalKeys;
    if (originalRevoked === undefined) delete process.env.ATTESTATION_REVOKED_KEYS_CONFIG;
    else process.env.ATTESTATION_REVOKED_KEYS_CONFIG = originalRevoked;
  });

  it('compares signed unix seconds with ISO windows in milliseconds correctly', () => {
    expect(isAttestationKeyValid(ADDRESS, Date.parse('2026-06-01') / 1000, registry())).toBe(true);
    expect(isAttestationKeyValid(ADDRESS, Date.parse('2025-12-31') / 1000, registry())).toBe(false);
    expect(isAttestationKeyValid(ADDRESS, Date.parse('2027-01-01') / 1000, registry())).toBe(false);
    expect(isAttestationKeyValid(ADDRESS, Date.parse('2027-01-02') / 1000, registry())).toBe(false);
  });

  it('rejects invalid signed timestamps and malformed trust windows', () => {
    const config = registry();
    for (const checkedAt of [NaN, Infinity, -Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
      expect(isAttestationKeyValid(ADDRESS, checkedAt, config)).toBe(false);
    }
    config.keys[0].validFrom = 'invalid';
    expect(isAttestationKeyValid(ADDRESS, Date.parse('2026-06-01') / 1000, config)).toBe(false);
  });

  it('never treats a sample signer as production evidence', () => {
    expect(trustedAttesterEntry(ADDRESS, Date.parse('2026-06-01') / 1000, registry('sample'))).toBe(
      null
    );
  });

  it('honours the registry revocation list even if the key entry flag is stale', () => {
    const config = registry();
    config.revoked.push({
      key_id: 'test',
      revoked_at: '2026-06-02T00:00:00.000Z',
      reason: 'compromise',
    });
    expect(isAttestationKeyValid(ADDRESS, Date.parse('2026-06-01') / 1000, config)).toBe(false);
  });

  it('preserves an explicitly configured sample role during normalization', () => {
    process.env.ATTESTATION_KEYS_CONFIG = JSON.stringify([
      { public_key: ADDRESS, role: 'sample', validFrom: '2026-01-01T00:00:00.000Z' },
    ]);
    const config = buildKeyRegistryConfig(null, ADDRESS);
    expect(config.keys).toHaveLength(1);
    expect(config.keys[0]?.role).toBe('sample');
    expect(trustedAttesterEntry(ADDRESS, Date.parse('2026-06-01') / 1000, config)).toBeNull();
  });

  it('fails closed when explicit key or revocation JSON is malformed', () => {
    process.env.ATTESTATION_KEYS_CONFIG = '{bad json';
    expect(() => buildKeyRegistryConfig(ADDRESS)).toThrow(/Invalid attestation key registry/);

    process.env.ATTESTATION_KEYS_CONFIG = JSON.stringify([{ public_key: ADDRESS }]);
    process.env.ATTESTATION_REVOKED_KEYS_CONFIG = '{bad json';
    expect(() => buildKeyRegistryConfig(ADDRESS)).toThrow(/Invalid attestation key registry/);

    delete process.env.ATTESTATION_REVOKED_KEYS_CONFIG;
    process.env.ATTESTATION_KEYS_CONFIG = JSON.stringify([
      { public_key: ADDRESS, role: 'unexpected' },
    ]);
    expect(() => buildKeyRegistryConfig(ADDRESS)).toThrow(/role must be attester or sample/);
  });

  it('rejects malformed entries inside otherwise valid registry arrays', () => {
    for (const revoked of [
      [null],
      [{ key_id: 'test', revoked_at: '2026-06-01' }],
      [{ key_id: 'test', revoked_at: 'not a date', reason: 'compromise' }],
    ]) {
      process.env.ATTESTATION_REVOKED_KEYS_CONFIG = JSON.stringify(revoked);
      expect(() => buildKeyRegistryConfig(ADDRESS)).toThrow(/Invalid attestation key registry/);
    }
    delete process.env.ATTESTATION_REVOKED_KEYS_CONFIG;

    for (const invalid of [
      null,
      { public_key: ADDRESS, revoked: 'false' },
      { public_key: ADDRESS, validFrom: 123 },
      { public_key: ADDRESS, validFrom: null },
      { public_key: ADDRESS, validFrom: '2026-02-30' },
      { public_key: ADDRESS, validFrom: '2026-01-01', validUntil: '2025-01-01' },
      { public_key: ADDRESS, algorithm: 'none' },
    ]) {
      process.env.ATTESTATION_KEYS_CONFIG = JSON.stringify([invalid]);
      expect(() => buildKeyRegistryConfig(ADDRESS)).toThrow(/Invalid attestation key registry/);
    }
  });

  it('does not allow the sample signer to inherit a production role', () => {
    process.env.ATTESTATION_KEYS_CONFIG = JSON.stringify([{ public_key: ADDRESS }]);
    expect(() => buildKeyRegistryConfig(null, ADDRESS)).toThrow(
      /sample signer cannot be registered/
    );

    delete process.env.ATTESTATION_KEYS_CONFIG;
    expect(() => buildKeyRegistryConfig(ADDRESS, ADDRESS)).toThrow(/different keys/);
  });

  it('requires distinct key ids so revocation identifies one issuer key', () => {
    process.env.ATTESTATION_KEYS_CONFIG = JSON.stringify([
      { key_id: 'same', public_key: ADDRESS },
      { key_id: 'same', public_key: '0x2222222222222222222222222222222222222222' },
    ]);
    expect(() => buildKeyRegistryConfig(null)).toThrow(/duplicate key_id/);

    delete process.env.ATTESTATION_KEYS_CONFIG;
    const originalSampleId = process.env.ATTESTATION_SAMPLE_KEY_ID;
    process.env.ATTESTATION_SAMPLE_KEY_ID = 'insight-oracle-safety-v2';
    try {
      expect(() =>
        buildKeyRegistryConfig(ADDRESS, '0x2222222222222222222222222222222222222222')
      ).toThrow(/duplicate key_id/);
    } finally {
      if (originalSampleId === undefined) delete process.env.ATTESTATION_SAMPLE_KEY_ID;
      else process.env.ATTESTATION_SAMPLE_KEY_ID = originalSampleId;
    }
  });

  it('applies revocations to the single-key fallback registry', () => {
    delete process.env.ATTESTATION_KEYS_CONFIG;
    process.env.ATTESTATION_REVOKED_KEYS_CONFIG = JSON.stringify([
      { key_id: 'insight-oracle-safety-v2', revoked_at: '2026-06-01', reason: 'compromise' },
    ]);
    const config = buildKeyRegistryConfig(ADDRESS);
    expect(isAttestationKeyValid(ADDRESS, Date.parse('2026-06-02') / 1000, config)).toBe(false);
  });

  it('turns a valid self-signature from an unknown issuer into an invalid result', () => {
    const result = {
      valid: true,
      attester: '0x2222222222222222222222222222222222222222',
      checkedAt: Date.parse('2026-06-01') / 1000,
      reason: 'verified',
    };
    enforceAttestationKeyTrust(result, registry());
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/unknown, revoked/);
  });
});
