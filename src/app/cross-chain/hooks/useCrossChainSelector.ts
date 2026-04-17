import { type OracleProvider, type Blockchain } from '@/lib/oracles';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';

import { type RefreshInterval } from '../constants';

export interface UseCrossChainSelectorReturn {
  selectedProvider: OracleProvider;
  setSelectedProvider: (provider: OracleProvider) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (range: number) => void;
  selectedBaseChain: Blockchain | null;
  setSelectedBaseChain: (chain: Blockchain | null) => void;
  refreshInterval: RefreshInterval;
  setRefreshInterval: (interval: RefreshInterval) => void;
}

export function useCrossChainSelector(): UseCrossChainSelectorReturn {
  const {
    selectedProvider,
    setSelectedProvider,
    selectedSymbol,
    setSelectedSymbol,
    selectedTimeRange,
    setSelectedTimeRange,
    selectedBaseChain,
    setSelectedBaseChain,
  } = useCrossChainSelectorStore();

  const { refreshInterval, setRefreshInterval } = useCrossChainConfigStore();

  return {
    selectedProvider,
    setSelectedProvider,
    selectedSymbol,
    setSelectedSymbol,
    selectedTimeRange,
    setSelectedTimeRange,
    selectedBaseChain,
    setSelectedBaseChain,
    refreshInterval,
    setRefreshInterval,
  };
}
