'use client';

import { useSyncExternalStore } from 'react';

import { getAppUrl } from '@/lib/utils/appUrl';

const subscribe = () => () => {};

const getServerAppUrl = () => {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/+$/, '');
  return configured || 'https://oracleinsight.xyz';
};

/**
 * Returns the request origin in the browser without producing different server and
 * client text during hydration. Static examples first use the configured public
 * origin and update to the local origin immediately after hydration.
 */
export function useAppUrl(): string {
  return useSyncExternalStore(subscribe, getAppUrl, getServerAppUrl);
}
