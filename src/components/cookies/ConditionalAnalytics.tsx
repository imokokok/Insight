'use client';

import { useSyncExternalStore } from 'react';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { hasAnalyticsConsent } from './CookieConsent';

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('cookie-consent-change', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('cookie-consent-change', callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): boolean {
  return hasAnalyticsConsent();
}

function getServerSnapshot(): boolean {
  // No tracking on the server or during initial hydration — must match
  // client first-render to avoid hydration mismatch, then React updates.
  return false;
}

/**
 * Conditionally renders Vercel Analytics and Speed Insights based on the user's
 * cookie consent. Required for GDPR / ePrivacy compliance — non-essential
 * tracking scripts must not load until the user has explicitly opted in to the
 * "analytics" category via the {@link CookieConsent} banner.
 */
export function ConditionalAnalytics() {
  const consented = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!consented) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
