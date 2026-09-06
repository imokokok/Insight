'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

const ConnectionStatusIndicator = dynamic(
  () => import('@/components/realtime/ConnectionStatus').then((m) => m.ConnectionStatusIndicator),
  { ssr: false }
);
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

  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(() => setReady(true), { timeout: 1200 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <>
      <ConnectionStatusIndicator
        showLabel={false}
        showReconnectButton={true}
        className="fixed bottom-4 right-4 z-40"
      />
      <FeedbackButton />
      <CookieConsent />
    </>
  );
}
