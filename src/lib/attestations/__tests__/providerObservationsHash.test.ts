/**
 * Unit tests + published test vector for providerObservationsHash.
 *
 * The vector is reproducible on Raul's side via: ABI-encode each 7-field tuple,
 * keccak each, sort the 32-byte hashes lexicographically, concat, keccak.
 */

import {
  computeProviderObservationsHash,
  deriveCrossProviderAgreement,
  deriveParticipantCount,
} from '../providerObservationsHash';

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

  // VERITAS round 2 (2026-09-02) gifted us a one-line placeholder-gate test:
  // two honest gates covering two DIFFERENT assets can never share one
  // providerObservationsHash, because the observations bind the feed ids and
  // values of the asset actually priced. Our v3 demo packet reused one
  // observation block for both gates — exactly that fingerprint. These tests
  // pin the property so the demo/production path cannot regress into it.
  describe('placeholder-gate fingerprint (VERITAS round 2)', () => {
    const assetObservations = (
      feedId: string,
      priceUsd: number,
      ts: bigint
    ): ProviderObservationEntry[] =>
      ['chainlink', 'api3', 'redstone'].map((provider, i) => ({
        provider,
        feedId: `${feedId}:${i + 1}`,
        value: BigInt(Math.round(priceUsd * 1e8)),
        timestamp: ts,
        dataAgeSeconds: BigInt(4 + i * 2),
        included: true,
        exclusionReason: '',
      }));

    it('gates over two different assets never share the hash', () => {
      const wethGate = assetObservations('demo-feed:eip155:1/erc20:WETH', 3000.05, 1700000000n);
      const usdcGate = assetObservations('demo-feed:eip155:1/erc20:USDC', 1.0, 1700000000n);
      expect(computeProviderObservationsHash(wethGate)).not.toBe(
        computeProviderObservationsHash(usdcGate)
      );
    });

    it('the hash changes even when only the feed id differs (same values)', () => {
      // The fingerprint came from placeholders sharing EVERYTHING. Bind on the
      // feed id alone: identical values under a different feed are a different
      // observation set.
      const a = entries.map((e) => ({ ...e, feedId: 'feed-A' }));
      const b = entries.map((e) => ({ ...e, feedId: 'feed-B' }));
      expect(computeProviderObservationsHash(a)).not.toBe(computeProviderObservationsHash(b));
    });
  });

  // VERITAS round 3 N6: the count and agreement figure a gate signs beside its
  // observations must DERIVE from those observations, so a consumer holding one
  // gate can recompute the signed numbers from the presented evidence. The
  // earlier demo packet signed participantCount 4 beside three observations and
  // 9900 bps of agreement beside three identical values.
  describe('gate count & agreement derive from observations (VERITAS round 3 N6)', () => {
    const obs = (
      values: number[],
      included: boolean[] = values.map(() => true)
    ): ProviderObservationEntry[] =>
      values.map((v, i) => ({
        provider: `p${i}`,
        feedId: `feed:${i}`,
        value: BigInt(Math.round(v * 1e8)),
        timestamp: 1700000000n,
        dataAgeSeconds: BigInt(4 + i),
        included: included[i],
        exclusionReason: included[i] ? '' : 'EXCLUDED',
      }));

    it('participantCount counts INCLUDED observations only', () => {
      const threeWithOneExcluded = obs([3000, 3000, 3000], [true, true, false]);
      expect(deriveParticipantCount(threeWithOneExcluded)).toBe(2);
      expect(deriveParticipantCount([])).toBe(0);
    });

    it('agreement is 1 (10000 bps) when the included values are identical', () => {
      const identical = obs([3000, 3000, 3000]);
      expect(deriveCrossProviderAgreement(identical)).toBe(1);
      expect(Math.round(deriveCrossProviderAgreement(identical) * 1e4)).toBe(10_000);
    });

    it('agreement falls with the included values spread: 1 - (max-min)/max', () => {
      // 3000 vs 3006 -> 1 - 6/3006 = 500/501 ≈ 0.998003992… -> 9980 bps.
      const spread = obs([3000, 3006]);
      expect(deriveCrossProviderAgreement(spread)).toBeCloseTo(500 / 501, 12);
      expect(Math.round(deriveCrossProviderAgreement(spread) * 1e4)).toBe(9_980);
    });

    it('excluded entries do not move the agreement figure', () => {
      const oneExcluded = obs([3000, 3006, 2000], [true, true, false]);
      expect(deriveCrossProviderAgreement(oneExcluded)).toBeCloseTo(500 / 501, 12);
    });

    it('empty observation set has no quorum: count 0, agreement 0', () => {
      expect(deriveParticipantCount([])).toBe(0);
      expect(deriveCrossProviderAgreement([])).toBe(0);
    });
  });
});
