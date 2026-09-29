import {
  CONSENT_KEY,
  CONSENT_VERSION,
  hasAnalyticsConsent,
  loadConsent,
  saveConsent,
} from '../consent';

describe('cookie consent storage boundary', () => {
  beforeEach(() => localStorage.clear());

  it('round trips an explicit analytics decision', () => {
    saveConsent({ essential: true, analytics: true, functional: false });
    expect(loadConsent()?.preferences).toEqual({
      essential: true,
      analytics: true,
      functional: false,
    });
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it.each([
    null,
    [],
    { version: CONSENT_VERSION, timestamp: new Date().toISOString(), preferences: {} },
    {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      preferences: { essential: false, analytics: true, functional: false },
    },
    {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      preferences: { essential: true, analytics: 'true', functional: false },
    },
    {
      version: CONSENT_VERSION,
      timestamp: 'invalid',
      preferences: { essential: true, analytics: true, functional: false },
    },
  ])('does not accept an incomplete stored decision: %p', (record) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    expect(loadConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });
});
