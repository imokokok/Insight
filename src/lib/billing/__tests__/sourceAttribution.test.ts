import {
  allocateFifoLots,
  allocationCoversCost,
  dominantLotSource,
  grantBucket,
} from '../sourceAttribution';

describe('grantBucket', () => {
  it('maps the existing ledger sources onto the three usage buckets', () => {
    expect(grantBucket('signup')).toBe('free');
    expect(grantBucket('subscription')).toBe('subscription');
    expect(grantBucket('wallet')).toBe('wallet');
    expect(grantBucket('x402')).toBe('wallet');
  });

  it('leaves untagged historical grants unattributed', () => {
    expect(grantBucket(null)).toBeNull();
    expect(grantBucket(undefined)).toBeNull();
    expect(grantBucket('something_else')).toBeNull();
  });
});

describe('allocateFifoLots', () => {
  const lots = [
    { lotId: 1, amount: 100, source: 'free' as const },
    { lotId: 2, amount: 50, source: 'subscription' as const },
  ];

  it('takes the whole charge from the oldest lot while it lasts', () => {
    expect(allocateFifoLots(lots, 0, 30)).toEqual([{ lotId: 1, source: 'free', amount: 30 }]);
  });

  it('skips fully exhausted lots and splits at the boundary', () => {
    expect(allocateFifoLots(lots, 80, 30)).toEqual([
      { lotId: 1, source: 'free', amount: 20 },
      { lotId: 2, source: 'subscription', amount: 10 },
    ]);
  });

  it('returns nothing when every lot is exhausted', () => {
    expect(allocateFifoLots(lots, 150, 10)).toEqual([]);
    expect(allocateFifoLots(lots, 400, 10)).toEqual([]);
  });

  it('reports an under-covered charge instead of inventing a source', () => {
    const allocations = allocateFifoLots(lots, 140, 30);
    expect(allocations).toEqual([{ lotId: 2, source: 'subscription', amount: 10 }]);
    expect(allocationCoversCost(allocations, 30)).toBe(false);
  });

  it('keeps historical null-source lots null', () => {
    expect(allocateFifoLots([{ lotId: 9, amount: 120, source: null }], 0, 20)).toEqual([
      { lotId: 9, source: null, amount: 20 },
    ]);
  });

  it('rounds allocations to the ledger precision without drifting', () => {
    const allocations = allocateFifoLots([{ lotId: 1, amount: 10, source: 'wallet' }], 0, 3.33);
    expect(allocations).toEqual([{ lotId: 1, source: 'wallet', amount: 3.33 }]);
  });
});

describe('dominantLotSource', () => {
  it('uses the lot with the largest share, not the first lot touched', () => {
    expect(
      dominantLotSource([
        { lotId: 1, source: 'free', amount: 10 },
        { lotId: 2, source: 'subscription', amount: 15 },
      ])
    ).toBe('subscription');
  });

  it('keeps the earlier lot on a tie', () => {
    expect(
      dominantLotSource([
        { lotId: 1, source: 'free', amount: 10 },
        { lotId: 2, source: 'subscription', amount: 10 },
      ])
    ).toBe('free');
  });

  it('returns null when nothing was attributed', () => {
    expect(dominantLotSource([])).toBeNull();
  });
});
