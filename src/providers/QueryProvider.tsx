'use client';

import { type ReactNode, useState } from 'react';

import dynamic from 'next/dynamic';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface QueryProviderProps {
  children: ReactNode;
}

const isDev = process.env.NODE_ENV === 'development';
const ReactQueryDevtools = isDev
  ? dynamic(
      () => import('@tanstack/react-query-devtools').then((module) => module.ReactQueryDevtools),
      { ssr: false }
    )
  : null;

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Oracle price data is polled into the DB every 15 minutes, so a 60s
            // stale window stays well within the data's real update cadence.
            // The previous 30s window caused redundant refetches that
            // returned identical payloads.
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            // 15-minute data does not become stale because the user switched
            // tabs. Disabling focus-refetch avoids a burst of identical
            // refetches (and the associated loading flicker) every time the
            // user returns to the tab. Queries that genuinely need to
            // refresh on focus can still opt in per-query.
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {ReactQueryDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
