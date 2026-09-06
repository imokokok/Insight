export const CONSENT_KEY = 'insight-cookie-consent';
export const CONSENT_VERSION = 1;

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
}

interface CookieConsentRecord {
  version: number;
  timestamp: string;
  preferences: CookiePreferences;
}

export const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  functional: false,
};

export function loadConsent(): CookieConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentRecord;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (!parsed.preferences || typeof parsed.preferences !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConsent(preferences: CookiePreferences): void {
  const record: CookieConsentRecord = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    preferences: { ...preferences, essential: true },
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    // Storage can fail in hardened/private browsing modes.
  }
  window.dispatchEvent(new CustomEvent('cookie-consent-change'));
}

export function hasAnalyticsConsent(): boolean {
  return loadConsent()?.preferences.analytics === true;
}
