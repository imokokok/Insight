import { render, screen } from '@testing-library/react';

import { CREDIT_COST, METERING_CLASS_ORDER, formatCreditCost } from '@/lib/billing/metering';
import { PLANS, PLAN_ORDER, callPriceRange, callsPerCycle } from '@/lib/billing/plans';

import { PricingCards } from '../PricingCards';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('@/lib/navigation/progress', () => ({
  announceNavigationStart: jest.fn(),
}));

jest.mock('@/stores/authStore', () => ({
  useSession: () => null,
}));

describe('PricingCards', () => {
  it('formats monthly prices with thousands separators', () => {
    render(<PricingCards billingCycle="monthly" />);

    expect(
      screen.getByText(PLANS.developer.priceMonthly.toLocaleString('en-US'))
    ).toBeInTheDocument();
    expect(screen.getByText('1,099')).toBeInTheDocument();
    expect(screen.getByText('3,499')).toBeInTheDocument();
  });

  it('shows the annual total with separators and an effective monthly price', () => {
    render(<PricingCards billingCycle="yearly" />);

    expect(
      screen.getByText('2,519 USDC billed annually · effective monthly price')
    ).toBeInTheDocument();
    expect(
      screen.getByText('38,489 USDC billed annually · effective monthly price')
    ).toBeInTheDocument();
    expect(screen.getByText((PLANS.team.priceYearly / 12).toFixed(2))).toBeInTheDocument();
  });

  it('leads every tier above the base with an inheritance line', () => {
    render(<PricingCards billingCycle="monthly" />);

    expect(screen.getAllByText(/^Everything in .+, plus$/).map((node) => node.textContent)).toEqual(
      ['Everything in Developer, plus', 'Everything in Team, plus', 'Everything in Scale, plus']
    );
  });

  it('does not claim an inheritance line on the entry tier', () => {
    render(<PricingCards billingCycle="monthly" />);

    const developerHeading = screen.getByRole('heading', { name: PLANS.developer.name });
    const card = developerHeading.closest('div[class*="pricing-plan-card"]') as HTMLElement;

    expect(card.textContent).not.toContain('Everything in');
  });

  it('renders the metering ledger from CREDIT_COST, not from literals', () => {
    render(<PricingCards billingCycle="monthly" />);

    for (const cls of METERING_CLASS_ORDER) {
      expect(screen.getByText(formatCreditCost(cls))).toBeInTheDocument();
    }
  });

  it('prints the C3 per-call range derived from plans and packs', () => {
    render(<PricingCards billingCycle="monthly" />);

    const range = callPriceRange('C3');
    expect(document.body.textContent).toContain(
      `$${range.min.toFixed(4)}–$${range.max.toFixed(4)} per call`
    );
  });

  it('translates each allowance into pre-trade checks', () => {
    render(<PricingCards billingCycle="monthly" />);

    for (const planId of PLAN_ORDER.filter((id) => id !== 'enterprise')) {
      const checks = callsPerCycle(planId, 'C3').toLocaleString('en-US');
      expect(screen.getByText(`≈${checks} pre-trade checks / month`)).toBeInTheDocument();
    }
  });

  it('states that a prepaid pack is settlement, not a discount', () => {
    render(<PricingCards billingCycle="monthly" />);

    expect(document.body.textContent).toContain('A pack is not a volume discount');
    expect(document.body.textContent).toContain('one invoice instead of a per-call on-chain x402');
  });

  it('keeps the metering ledger consistent with CREDIT_COST for every class', () => {
    render(<PricingCards billingCycle="monthly" />);

    for (const cls of METERING_CLASS_ORDER) {
      expect(document.body.textContent).toContain(`${CREDIT_COST[cls]} cr`);
    }
  });
});
