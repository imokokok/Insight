import {
  CREDIT_COST,
  METERING_CLASS_ORDER,
  creditAllowanceExamples,
  creditCostRange,
  formatCreditCost,
} from '@/lib/billing/metering';
import { CREDIT_PACKS, callPriceRange, callsPerCycle, creditPricePaths } from '@/lib/billing/plans';

/**
 * The pricing page renders every credit cost and per-call figure through these
 * helpers. These tests pin the derivation so a re-priced metering class updates
 * every surface at once, and so the page can never print a stale hardcoded
 * number again.
 */
describe('derived pricing', () => {
  it('formats every metering class straight from CREDIT_COST', () => {
    for (const cls of METERING_CLASS_ORDER) {
      expect(formatCreditCost(cls)).toBe(`${CREDIT_COST[cls]} cr`);
      expect(formatCreditCost(cls, 'long')).toBe(`${CREDIT_COST[cls]} credits`);
    }
  });

  it('reports the metering ladder span shown in the hero ledger', () => {
    expect(creditCostRange()).toEqual({ min: 0.5, max: 10 });
  });

  it('translates credit allowances into concrete call counts', () => {
    expect(creditAllowanceExamples(25_000, ['C2', 'C3'])).toBe(
      '≈12,500 deep-analysis calls or ≈5,000 pre-trade checks'
    );
    expect(creditAllowanceExamples(100_000, ['C2', 'C3'])).toBe(
      '≈50,000 deep-analysis calls or ≈20,000 pre-trade checks'
    );
    expect(creditAllowanceExamples(500_000, ['C3', 'C4'])).toBe(
      '≈100,000 pre-trade checks or ≈50,000 attested receipts'
    );
  });

  it('keeps pack descriptions a function of the metering classes', () => {
    // These exact strings used to be hardcoded in plans.ts. They are now
    // derived, and the derived output must stay byte-identical.
    expect(CREDIT_PACKS.starter.description).toBe(
      '≈12,500 deep-analysis calls or ≈5,000 pre-trade checks'
    );
    expect(CREDIT_PACKS.builder.description).toBe(
      '≈50,000 deep-analysis calls or ≈20,000 pre-trade checks'
    );
    expect(CREDIT_PACKS.agent.description).toBe(
      '≈100,000 pre-trade checks or ≈50,000 attested receipts'
    );
  });

  it('covers every paid path exactly once and never lists enterprise', () => {
    expect(creditPricePaths().map((path) => path.id)).toEqual([
      'developer-monthly',
      'developer-yearly',
      'team-monthly',
      'team-yearly',
      'scale-monthly',
      'scale-yearly',
      'starter-pack',
      'builder-pack',
      'agent-pack',
    ]);
  });

  it('pins the C3 per-call range the pricing page prints', () => {
    const range = callPriceRange('C3');
    expect(range.min.toFixed(4)).toBe('0.0160');
    expect(range.max.toFixed(4)).toBe('0.0198');
    expect(range.min).toBeLessThan(range.max);
  });

  it('prices the largest annual plan cheapest and the smallest pack dearest', () => {
    const ranked = creditPricePaths()
      .map((path) => ({ id: path.id, usdPerCheck: path.usdPerCredit * CREDIT_COST.C3 }))
      .sort((left, right) => left.usdPerCheck - right.usdPerCheck);

    expect(ranked[0].id).toBe('scale-yearly');
    expect(ranked[ranked.length - 1].id).toBe('starter-pack');

    // Prepaid packs are a settlement convenience, not a volume discount: the
    // whole pack band must stay within 10% of the keyless x402 list price.
    const keylessX402 = CREDIT_COST.C3 * 0.004;
    for (const entry of ranked.filter((item) => item.id.endsWith('-pack'))) {
      expect(entry.usdPerCheck).toBeGreaterThan(keylessX402 * 0.9);
      expect(entry.usdPerCheck).toBeLessThanOrEqual(keylessX402);
    }
  });

  it('translates a plan allowance into pre-trade checks', () => {
    expect(callsPerCycle('developer', 'C3')).toBe(12_000);
    expect(callsPerCycle('team', 'C3')).toBe(60_000);
    expect(callsPerCycle('scale', 'C3')).toBe(200_000);
    expect(callsPerCycle('enterprise', 'C3')).toBe(Number.POSITIVE_INFINITY);
  });
});
