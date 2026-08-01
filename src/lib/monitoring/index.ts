import * as Sentry from '@sentry/nextjs';

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
  Sentry.captureException(error, { extra: context });
};

export const setUser = (user: SentryUser | User | null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: (user as SentryUser).username,
    });
  } else {
    Sentry.setUser(null);
  }
};

export const addBreadcrumb = (breadcrumb: Breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};
