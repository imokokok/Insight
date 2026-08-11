/**
 * @jest-environment node
 *
 * getAppUrl branches on `typeof window`. Under the node test environment `window`
 * is undefined, so the server/env branch (the one this file primarily guards) is
 * exercised directly. The client branch is simulated by installing a fake `window`.
 */

import { getAppUrl } from '../appUrl';

describe('getAppUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    }
    delete (globalThis as { window?: unknown }).window;
  });

  it('returns window.location.origin when running in the browser', () => {
    (globalThis as { window?: unknown }).window = {
      location: { origin: 'http://client.local' },
    };
    expect(getAppUrl()).toBe('http://client.local');
  });

  it('falls back to the hardcoded default when the env var is unset', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getAppUrl()).toBe('https://oracleinsight.xyz');
  });

  it('returns the env var with a single trailing slash stripped', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/';
    expect(getAppUrl()).toBe('https://app.example.com');
  });

  it('trims surrounding whitespace and strips multiple trailing slashes', () => {
    process.env.NEXT_PUBLIC_APP_URL = '  https://app.example.com//  ';
    expect(getAppUrl()).toBe('https://app.example.com');
  });
});
