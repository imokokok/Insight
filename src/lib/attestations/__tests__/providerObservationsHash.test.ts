/**
 * Unit tests + published test vector for providerObservationsHash.
 *
 * The vector is reproducible on Raul's side via: ABI-encode each 7-field tuple,
 * keccak each, sort the 32-byte hashes lexicographically, concat, keccak.
 */

import { computeProviderObservationsHash } from '../providerObservationsHash';

import type { ProviderObservationEntry } from '../providerObservationsHash';

const entries: ProviderObservationEntry[] = [
  {
    provider: 'chainlink',
    feedId: '0x...',
    value: 300005000000n, // 3000.05 * 1e8
    timestamp: 1700000000n,
    dataAgeSeconds: 2n,
    included: true,
    exclusionReason: '',
  },
  {
    provider: 'api3',
    feedId: 'BTC/USD',
    value: 299990000000n,
    timestamp: 1700000001n,
    dataAgeSeconds: 1n,
    included: true,
    exclusionReason: '',
  },
  {
    provider: 'dia',
    feedId: '0xabc',
    value: 305000000000n,
    timestamp: 1699999800n,
    dataAgeSeconds: 202n,
    included: false,
    exclusionReason: 'STALE_DATA',
  },
];

describe('computeProviderObservationsHash', () => {
  it('returns a 32-byte digest', () => {
    const h = computeProviderObservationsHash(entries);
    expect(h).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('publishes a stable test vector', () => {
    expect(computeProviderObservationsHash(entries)).toBe(
      '0x1b122f7bcabfe29dc37c2698dcfe3d8f59a9bd9a81455036abe2b9fe2ba3bf3a'
    );
  });

  it('is order-independent (canonical sort)', () => {
    // Shuffled input MUST produce the same root — the sort makes the hash a
    // function of the SET of observations, not their input order.
    const shuffled: ProviderObservationEntry[] = [entries[2], entries[0], entries[1]];
    expect(computeProviderObservationsHash(shuffled)).toBe(
      computeProviderObservationsHash(entries)
    );
  });

  it('changes when an observation value changes', () => {
    const mutated: ProviderObservationEntry[] = entries.map((e) =>
      e.provider === 'chainlink' ? { ...e, value: 300006000000n } : e
    );
    expect(computeProviderObservationsHash(mutated)).not.toBe(
      computeProviderObservationsHash(entries)
    );
  });

  it('changes when inclusion status / exclusion reason changes', () => {
    const flipInclusion = entries.map((e) =>
      e.provider === 'dia' ? { ...e, included: true, exclusionReason: '' } : e
    );
    expect(computeProviderObservationsHash(flipInclusion)).not.toBe(
      computeProviderObservationsHash(entries)
    );
  });

  it('changes when an entry is added or removed', () => {
    const subset = entries.slice(0, 2);
    expect(computeProviderObservationsHash(subset)).not.toBe(
      computeProviderObservationsHash(entries)
    );
    const extra: ProviderObservationEntry[] = [
      ...entries,
      {
        provider: 'redstone',
        feedId: 'BTC',
        value: 300010000000n,
        timestamp: 1700000002n,
        dataAgeSeconds: 0n,
        included: true,
        exclusionReason: '',
      },
    ];
    expect(computeProviderObservationsHash(extra)).not.toBe(
      computeProviderObservationsHash(entries)
    );
  });

  it('hashes an empty list to keccak256(empty) — a well-known constant', () => {
    // 0xc5d246... is keccak256 of zero bytes — the published empty-set vector.
    expect(computeProviderObservationsHash([])).toBe(
      '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'
    );
  });
});
