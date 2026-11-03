import { isNavigationGroupActive, isNavigationLinkActive } from '../isNavigationLinkActive';
import { type NavItem } from '../types';

describe('isNavigationLinkActive', () => {
  it('matches a route that declares a required workflow query', () => {
    expect(
      isNavigationLinkActive('/price-insight?stage=observe', '/price-insight', 'stage=observe')
    ).toBe(true);
  });

  it('does not mark a different workflow stage as active', () => {
    expect(
      isNavigationLinkActive('/price-insight?stage=observe', '/price-insight', 'stage=compare')
    ).toBe(false);
  });

  it('allows unrelated current query parameters while preserving the target contract', () => {
    expect(
      isNavigationLinkActive(
        '/price-insight?stage=compare',
        '/price-insight',
        'stage=compare&utm_source=docs'
      )
    ).toBe(true);
  });

  it('keeps path-only links active for nested routes', () => {
    expect(isNavigationLinkActive('/reports', '/reports/2026-10-27')).toBe(true);
  });

  it('uses query-aware matching for navigation groups', () => {
    const items: NavItem[] = [
      { href: '/price-insight?stage=compare', label: 'Compare' },
      { href: '/safety-check', label: 'Stress test' },
    ];

    expect(isNavigationGroupActive(items, '/price-insight', 'stage=compare')).toBe(true);
    expect(isNavigationGroupActive(items, '/price-insight', 'stage=observe')).toBe(false);
  });
});
