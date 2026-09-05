import { PLAN_ORDER, PLANS, planCreditGrant } from '@/lib/billing/plans';

describe('billing plans', () => {
  it('keeps the self-serve ladder ordered below enterprise', () => {
    expect(PLAN_ORDER).toEqual(['developer', 'team', 'scale', 'enterprise']);
  });

  it.each([
    ['developer', 60_000, 60, 49, 490],
    ['team', 300_000, 300, 199, 1990],
    ['scale', 1_000_000, 1_200, 499, 4990],
  ] as const)(
    'defines the %s subscription capacity and price',
    (plan, credits, rateLimit, monthlyPrice, yearlyPrice) => {
      expect(PLANS[plan]).toMatchObject({
        monthlyQuota: credits,
        rateLimit,
        priceMonthly: monthlyPrice,
        priceYearly: yearlyPrice,
      });
      expect(planCreditGrant(plan)).toBe(credits);
    }
  );

  it('does not grant wallet credits for unlimited enterprise accounts', () => {
    expect(planCreditGrant('enterprise')).toBe(0);
  });
});
