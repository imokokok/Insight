'use client';

import { type ReactNode, useState } from 'react';

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';

import { isAppError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ReactQuery');

interface ReactQueryProviderProps {
  children: ReactNode;
}

export const STALE_TIME_CONFIG = {
  price: 30 * 1000,
  history: 5 * 60 * 1000,
  network: 60 * 1000,
  default: 30 * 1000,
} as const;

export const GC_TIME_CONFIG = {
  price: 5 * 60 * 1000,
  history: 5 * 60 * 1000,
  network: 5 * 60 * 1000,
  default: 5 * 60 * 1000,
} as const;

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_TIME_CONFIG.default,
            gcTime: GC_TIME_CONFIG.default,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: true,
            retry: (failureCount, error) => {
              if (isAppError(error) && !error.isOperational) {
                return false;
              }
              if (failureCount >= 2) {
                return false;
              }
              return true;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            structuralSharing: true,
          },
          mutations: {
            retry: 1,
            retryDelay: 1000,
          },
        },
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (isAppError(error)) {
              logger.error(
                `Query error [${query.queryHash}]: ${error.code} - ${error.message}`,
                error,
                {
                  statusCode: error.statusCode,
                  details: error.details,
                  queryKey: query.queryKey,
                }
              );
            } else if (error instanceof Error) {
              logger.error(`Query error [${query.queryHash}]: ${error.message}`, error, {
                queryKey: query.queryKey,
              });
            } else {
              logger.error(`Query error [${query.queryHash}]: Unknown error`, undefined, {
                queryKey: query.queryKey,
                error,
              });
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, variables, context, mutation) => {
            if (isAppError(error)) {
              logger.error(`Mutation error: ${error.code} - ${error.message}`, error, {
                statusCode: error.statusCode,
                details: error.details,
                mutationKey: mutation.options.mutationKey,
              });
            } else if (error instanceof Error) {
              logger.error(`Mutation error: ${error.message}`, error, {
                mutationKey: mutation.options.mutationKey,
              });
            } else {
              logger.error('Mutation error: Unknown error', undefined, {
                error,
              });
            }
          },
        }),
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
