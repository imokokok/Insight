'use client';

import { useMemo } from 'react';

import { getDefaultFactory } from '@/lib/oracles';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type Blockchain } from '@/types/oracle';

export function useCurrentClient() {
  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  return useMemo(() => getDefaultFactory().getClient(selectedProvider), [selectedProvider]);
}

export function useSupportedChains(): Blockchain[] {
  const currentClient = useCurrentClient();
  return useMemo(() => [...currentClient.supportedChains], [currentClient]);
}

export function useFilteredChains(): Blockchain[] {
  const supportedChains = useSupportedChains();
  const visibleChains = useCrossChainUIStore((s) => s.visibleChains);
  return useMemo(
    () => supportedChains.filter((chain) => visibleChains.includes(chain)),
    [supportedChains, visibleChains]
  );
}
