import { hasAnalyticsConsent } from '@/lib/cookies/consent';

import type { User } from '@supabase/supabase-js';

interface SentryUser {
  id: string;
  email?: string;
  username?: string;
}

interface Breadcrumb {
  category: string;
  message: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

const importSentry = () => import('@sentry/nextjs');

let sentryPromise: ReturnType<typeof importSentry> | null = null;

function loadSentry(): ReturnType<typeof importSentry> | null {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return null;
  if (typeof window !== 'undefined' && !hasAnalyticsConsent()) return null;
  sentryPromise ??= importSentry();
  return sentryPromise;
}

function withSentry(action: (sentry: Awaited<ReturnType<typeof importSentry>>) => void): void {
  const promise = loadSentry();
  if (!promise) return;
  // Optional telemetry must never create an unhandled rejection in the app
  // when its client chunk fails to load.
  void promise.then(action).catch(() => undefined);
}

export const captureException = (error: Error, context?: Record<string, unknown>) => {
  withSentry((Sentry) => Sentry.captureException(error, { extra: context }));
};

export const setUser = (user: SentryUser | User | null) => {
  withSentry((Sentry) => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: (user as SentryUser).username,
      });
    } else {
      Sentry.setUser(null);
    }
  });
};

export const addBreadcrumb = (breadcrumb: Breadcrumb) => {
  withSentry((Sentry) => Sentry.addBreadcrumb(breadcrumb));
};
