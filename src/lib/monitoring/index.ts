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

export const captureException = (error: Error, context?: Record<string, unknown>) => {
  void loadSentry()?.then((Sentry) => Sentry.captureException(error, { extra: context }));
};

export const setUser = (user: SentryUser | User | null) => {
  void loadSentry()?.then((Sentry) => {
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
  void loadSentry()?.then((Sentry) => Sentry.addBreadcrumb(breadcrumb));
};
