import * as Sentry from '@sentry/nextjs';

import { initWebVitals, reportCustomMetric, type WebVitalMetric } from './webVitals';

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

export const captureException = (error: Error, context?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    Sentry.captureException(error, { extra: context });
  }
};

const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (typeof window !== 'undefined') {
    Sentry.captureMessage(message, level);
  }
};

const startSpan = <T>(name: string, callback: () => T): T => {
  if (typeof window !== 'undefined') {
    return Sentry.startSpan({ name }, callback);
  }
  return callback();
};

export const setUser = (user: SentryUser | User | null) => {
  if (typeof window !== 'undefined') {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: (user as SentryUser).username,
      });
    } else {
      Sentry.setUser(null);
    }
  }
};

export const addBreadcrumb = (breadcrumb: Breadcrumb) => {
  if (typeof window !== 'undefined') {
    Sentry.addBreadcrumb(breadcrumb);
  }
};

export { reportCustomMetric };
