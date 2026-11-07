import { CREDIT_BILLING_HEADER_NAMES } from '@/lib/billing/billingHeaders';

import { getCorsHeaders } from '../handler';
import { X402_ONBOARDING_HEADER_NAMES, corsExposeHeaders } from '../x402/corsExposeHeaders';
import { x402OnboardingHeaders } from '../x402/guard';

/**
 * The 402 hints are aimed at machine clients, but browser-based MCP hosts and
 * in-browser explorers can only read them when CORS exposes them. The REST
 * handler, the MCP HTTP transport, and the MPP pre-trade bridge each rebuild
 * that list from a different response object, so all of them must derive it
 * from one shared source.
 */
describe('CORS exposure of x402 onboarding hints', () => {
  const parseExposed = (value: string): string[] =>
    value
      .toLowerCase()
      .split(',')
      .map((name) => name.trim());

  it('keeps the shared name list identical to the emitted hint keys', () => {
    expect([...X402_ONBOARDING_HEADER_NAMES].sort()).toEqual(
      Object.keys(x402OnboardingHeaders()).sort()
    );
  });

  it('exposes every advisory header from the REST handler', () => {
    const exposed = parseExposed(getCorsHeaders({})['Access-Control-Expose-Headers']);
    for (const name of X402_ONBOARDING_HEADER_NAMES) {
      expect(exposed).toContain(name.toLowerCase());
    }
  });

  it('exposes every advisory header from the MCP transport list', () => {
    const exposed = parseExposed(corsExposeHeaders('X-RateLimit-Limit', 'X-Quota-Reset'));
    for (const name of X402_ONBOARDING_HEADER_NAMES) {
      expect(exposed).toContain(name.toLowerCase());
    }
    expect(exposed).toContain('x-ratelimit-limit');
    expect(exposed).toContain('x-quota-reset');
  });

  it('exposes every canonical credit billing header', () => {
    const exposed = parseExposed(corsExposeHeaders());
    for (const name of CREDIT_BILLING_HEADER_NAMES) {
      expect(exposed).toContain(name.toLowerCase());
    }
    expect(exposed).toContain('x-credit-budget-warning');
  });

  it('retains payment and credit headers while de-duplicating extra names', () => {
    const exposed = parseExposed(corsExposeHeaders('X-Request-Id', 'Payment-Receipt'));
    expect(exposed).toContain('payment-receipt');
    expect(exposed.filter((name) => name === 'x-request-id')).toHaveLength(1);
    expect(exposed.filter((name) => name === 'payment-receipt')).toHaveLength(1);
  });
});
