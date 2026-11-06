import { getCorsHeaders } from '../handler';
import { x402OnboardingHeaders } from '../x402/guard';

/**
 * The 402 hints are aimed at machine clients, but browser-based MCP hosts and
 * in-browser explorers can only read them when CORS exposes them. Guard against
 * the expose list drifting away from the header vocabulary in guard.ts.
 */
describe('CORS exposure of x402 onboarding hints', () => {
  const exposed = getCorsHeaders({})
    ['Access-Control-Expose-Headers'].toLowerCase()
    .split(',')
    .map((name) => name.trim());

  it('exposes every advisory header emitted on a bare 402', () => {
    const names = Object.keys(x402OnboardingHeaders());
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(exposed).toContain(name.toLowerCase());
    }
  });
});
