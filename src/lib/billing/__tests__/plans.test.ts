import { CREDIT_PACKS, PLAN_ORDER, PLANS, planCreditGrant } from '@/lib/billing/plans';

describe('billing plans', () => {
  it('keeps the self-serve ladder ordered below enterprise', () => {
    expect(PLAN_ORDER).toEqual(['developer', 'team', 'scale', 'enterprise']);
  });

  it.each([
    ['developer', 25_000, 120, 19, 190],
    ['team', 120_000, 400, 79, 790],
    ['scale', 500_000, 1_200, 299, 2_990],
  ] as const)(
    'defines the %s subscription capacity and price',
    (plan, credits, rateLimit, monthlyPrice, yearlyPrice) => {
      expect(PLANS[plan]).toMatchObject({
        monthlyQuota: credits,
        rateLimit,
        priceMonthly: monthlyPrice,
        priceYearly: yearlyPrice,
      });
      expect(yearlyPrice).toBe(monthlyPrice * 10);
      expect(planCreditGrant(plan)).toBe(credits);
    }
  );

  it.each([
    ['starter', 100_000, 99],
    ['builder', 400_000, 389],
    ['agent', 2_000_000, 1_849],
  ] as const)('defines the %s prepaid pack credits and price', (pack, credits, priceUsd) => {
    expect(CREDIT_PACKS[pack]).toMatchObject({ credits, priceUsd });
  });

  it('does not grant wallet credits for unlimited enterprise accounts', () => {
    expect(planCreditGrant('enterprise')).toBe(0);
  });
});
