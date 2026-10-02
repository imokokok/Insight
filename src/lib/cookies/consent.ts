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

function isConsentRecord(value: unknown): value is CookieConsentRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.version !== CONSENT_VERSION || typeof record.timestamp !== 'string') return false;
  if (!Number.isFinite(Date.parse(record.timestamp))) return false;
  const preferences = record.preferences;
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) return false;
  const flags = preferences as Record<string, unknown>;
  // An incomplete stored decision must not silently enable optional tracking.
  return (
    flags.essential === true &&
    typeof flags.analytics === 'boolean' &&
    typeof flags.functional === 'boolean'
  );
}

export function loadConsent(): CookieConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isConsentRecord(parsed) ? parsed : null;
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
