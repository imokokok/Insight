import * as Sentry from '@sentry/nextjs';

import { getCommonSentryOptions } from './src/lib/sentry/sharedConfig';

Sentry.init(getCommonSentryOptions());
