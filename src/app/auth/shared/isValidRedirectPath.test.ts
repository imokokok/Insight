import { getSafeRedirectPath, isValidRedirectPath } from './isValidRedirectPath';

describe('auth redirect validation', () => {
  it.each([
    '/',
    '/ops',
    '/ops/health?range=24h',
    '/settings?tab=billing',
    '/reports/2026-09-11',
    '/docs/api#examples',
  ])('accepts known same-origin routes: %s', (path) => {
    expect(isValidRedirectPath(path)).toBe(true);
    expect(getSafeRedirectPath(path)).toBe(path);
  });

  it.each([
    null,
    '',
    '//evil.example/path',
    'https://evil.example/path',
    'javascript:alert(1)',
    '/auth/reset-password',
    '/unknown-route',
  ])('rejects unsafe or unknown destinations: %s', (path) => {
    expect(isValidRedirectPath(path)).toBe(false);
    expect(getSafeRedirectPath(path)).toBe('/');
  });

  it('supports an explicit safe fallback', () => {
    expect(getSafeRedirectPath('https://evil.example', '/login')).toBe('/login');
  });
});
