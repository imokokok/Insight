/**
 * Credit-price drift guard.
 *
 * The C1..C4 ladder is a published price list — C1 $0.002, C2 $0.004,
 * C3 $0.02, C4 $0.04 at the canonical USD_PER_CREDIT = $0.001. These values
 * were rebased 4x by #478; a stale branch that predates it still carries the
 * old C1 = 0.5, and merging such a branch back must not silently re-price the
 * API. Changing a price has to be an explicit edit of this test.
 */

import { CREDIT_COST } from '../metering';
import { USD_PER_CREDIT } from '../plans';

const PUBLISHED_USD: Record<keyof typeof CREDIT_COST, number> = {
  C1: 0.002,
  C2: 0.004,
  C3: 0.02,
  C4: 0.04,
};

describe('credit price ladder', () => {
  it('pins the published C1..C4 credit costs', () => {
    expect(CREDIT_COST).toEqual({ C1: 2, C2: 4, C3: 20, C4: 40 });
  });

  it('matches the published USD list at the canonical credit rate', () => {
    expect(USD_PER_CREDIT).toBe(0.001);
    for (const cls of Object.keys(PUBLISHED_USD) as Array<keyof typeof CREDIT_COST>) {
      expect(CREDIT_COST[cls] * USD_PER_CREDIT).toBeCloseTo(PUBLISHED_USD[cls], 6);
    }
  });
});
