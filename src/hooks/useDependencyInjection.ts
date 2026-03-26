'use client';

import { useMemo, useCallback } from 'react';

import { container, registerServices, isServicesRegistered } from '@/lib/di';
import {
  type IAlertService,
  type IFavoriteService,
  type ISnapshotService,
} from '@/lib/di/serviceInterfaces';
import { SERVICE_TOKENS } from '@/lib/di/tokens';
import { type IOracleClient, type IOracleClientFactory } from '@/lib/oracles/interfaces';
import { type OracleProvider } from '@/types/oracle';

export function useService<T>(token: string): T {
  return useMemo(() => {
    if (!isServicesRegistered()) {
      registerServices();
    }
    return container.resolve<T>(token);
  }, [token]);
}

export function useOracleClient(provider: OracleProvider): IOracleClient {
  const factory = useService<IOracleClientFactory>(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);

  return useMemo(() => {
    return factory.getClient(provider);
  }, [factory, provider]);
}

export function useOracleClientFactory(): IOracleClientFactory {
  return useService<IOracleClientFactory>(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
}

export function useAlertService(): IAlertService {
  return useService<IAlertService>(SERVICE_TOKENS.ALERT_SERVICE);
}

export function useFavoriteService(): IFavoriteService {
  return useService<IFavoriteService>(SERVICE_TOKENS.FAVORITE_SERVICE);
}

export function useSnapshotService(): ISnapshotService {
  return useService<ISnapshotService>(SERVICE_TOKENS.SNAPSHOT_SERVICE);
}

export function useDependencyInjection() {
  const ensureRegistered = useCallback(() => {
    if (!isServicesRegistered()) {
      registerServices();
    }
  }, []);

  const resolve = useCallback(
    <T>(token: string): T => {
      ensureRegistered();
      return container.resolve<T>(token);
    },
    [ensureRegistered]
  );

  const has = useCallback((token: string): boolean => {
    return container.has(token);
  }, []);

  return useMemo(
    () => ({
      resolve,
      has,
      ensureRegistered,
      tokens: SERVICE_TOKENS,
    }),
    [resolve, has, ensureRegistered]
  );
}

export { useDependencyInjection as useDI };
