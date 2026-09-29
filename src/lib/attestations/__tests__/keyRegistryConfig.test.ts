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
