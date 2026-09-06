'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import { loadConsent } from '@/lib/cookies/consent';

const FeedbackButton = dynamic(
  () => import('@/components/feedback/FeedbackButton').then((m) => m.FeedbackButton),
  { ssr: false }
);
const CookieConsent = dynamic(
  () => import('@/components/cookies/CookieConsent').then((m) => m.CookieConsent),
  { ssr: false }
);

/** Non-critical global controls are mounted after the first render is idle. */
export function ClientUtilities() {
  const [ready, setReady] = useState(false);
  const [hasConsentDecision, setHasConsentDecision] = useState(false);

  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(
        () => {
          setHasConsentDecision(Boolean(loadConsent()));
          setReady(true);
        },
        { timeout: 1200 }
      );
      return () => idleWindow.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(() => {
      setHasConsentDecision(Boolean(loadConsent()));
      setReady(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;

  if (!hasConsentDecision) {
    return <CookieConsent onDecision={() => setHasConsentDecision(true)} />;
  }

  return <FeedbackButton />;
}
