import { CREDIT_PACKS, PLAN_ORDER, PLANS, planCreditGrant } from '@/lib/billing/plans';

describe('billing plans', () => {
  it('keeps the self-serve ladder ordered below enterprise', () => {
    expect(PLAN_ORDER).toEqual(['developer', 'team', 'scale', 'enterprise']);
  });

  it.each([
    ['developer', 60_000, 60, 229, 2519],
    ['team', 300_000, 300, 1099, 12089],
    ['scale', 1_000_000, 1_200, 3499, 38489],
  ] as const)(
    'defines the %s subscription capacity and price',
    (plan, credits, rateLimit, monthlyPrice, yearlyPrice) => {
      expect(PLANS[plan]).toMatchObject({
        monthlyQuota: credits,
        rateLimit,
        priceMonthly: monthlyPrice,
        priceYearly: yearlyPrice,
      });
      expect(yearlyPrice).toBe(monthlyPrice * 11);
      expect(planCreditGrant(plan)).toBe(credits);
    }
  );

  it.each([
    ['starter', 25_000, 99],
    ['builder', 100_000, 389],
    ['agent', 500_000, 1_849],
  ] as const)('defines the %s prepaid pack credits and price', (pack, credits, priceUsd) => {
    expect(CREDIT_PACKS[pack]).toMatchObject({ credits, priceUsd });
  });

  it('does not grant wallet credits for unlimited enterprise accounts', () => {
    expect(planCreditGrant('enterprise')).toBe(0);
  });
});
