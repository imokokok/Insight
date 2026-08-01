import * as Sentry from '@sentry/nextjs';

import { getCommonSentryOptions } from './src/lib/sentry/sharedConfig';

Sentry.init({
  ...getCommonSentryOptions(),

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
