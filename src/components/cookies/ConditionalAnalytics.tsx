'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { hasAnalyticsConsent } from '@/lib/cookies/consent';

const analyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;

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
 * Loads Cloudflare Web Analytics only after the user's explicit analytics
 * consent. The token is optional so local and preview builds stay untracked
 * until the zone is configured.
 */
export function ConditionalAnalytics() {
  const consented = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!consented || !analyticsToken) return;

    const script = document.createElement('script');
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.defer = true;
    script.setAttribute('data-cf-beacon', JSON.stringify({ token: analyticsToken }));
    script.dataset.insightAnalytics = 'cloudflare';
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [consented]);

  return null;
}
