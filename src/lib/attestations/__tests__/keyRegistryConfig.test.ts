import {
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
  it('compares signed unix seconds with ISO windows in milliseconds correctly', () => {
    expect(isAttestationKeyValid(ADDRESS, Date.parse('2026-06-01') / 1000, registry())).toBe(true);
    expect(isAttestationKeyValid(ADDRESS, Date.parse('2025-12-31') / 1000, registry())).toBe(false);
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
});
