'use client';

import { useMemo } from 'react';

import { useDynamicSymbols } from '@/hooks/data/useDynamicSymbols';
import { getOracleChains } from '@/lib/oracles/metadata';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type Blockchain } from '@/types/oracle';

export function useSupportedChains(): Blockchain[] {
  const selectedProvider = useCrossChainSelectorStore((s) => s.selectedProvider);
  const metadata = useDynamicSymbols();
  return useMemo(() => getOracleChains(metadata, selectedProvider), [metadata, selectedProvider]);
}

export function useFilteredChains(): Blockchain[] {
  const supportedChains = useSupportedChains();
  const visibleChains = useCrossChainUIStore((s) => s.visibleChains);
  return useMemo(
    () => supportedChains.filter((chain) => visibleChains.includes(chain)),
    [supportedChains, visibleChains]
  );
}
