'use client';

import { useSyncExternalStore } from 'react';

import dynamic from 'next/dynamic';

import { hasAnalyticsConsent } from '@/lib/cookies/consent';

const Analytics = dynamic(() => import('@vercel/analytics/react').then((m) => m.Analytics), {
  ssr: false,
});
const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then((m) => m.SpeedInsights),
  { ssr: false }
);

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
