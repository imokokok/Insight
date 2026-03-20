'use client';

import { Selectors } from './Selectors';
import { OracleProvider, Blockchain } from '@/lib/oracles';

interface QueryFormProps {
  selectedOracles: OracleProvider[];
  setSelectedOracles: (oracles: OracleProvider[]) => void;
  selectedChains: Blockchain[];
  setSelectedChains: (chains: Blockchain[]) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (timeRange: number) => void;
  isLoading: boolean;
  onQuery: () => void;
  supportedChainsBySelectedOracles: Set<Blockchain>;
  isCompareMode: boolean;
  setIsCompareMode: (mode: boolean) => void;
  compareTimeRange: number;
  setCompareTimeRange: (timeRange: number) => void;
  showBaseline: boolean;
  setShowBaseline: (show: boolean) => void;
}

export function QueryForm({
  selectedOracles,
  setSelectedOracles,
  selectedChains,
  setSelectedChains,
  selectedSymbol,
  setSelectedSymbol,
  selectedTimeRange,
  setSelectedTimeRange,
  isLoading,
  onQuery,
  supportedChainsBySelectedOracles,
  isCompareMode,
  setIsCompareMode,
  compareTimeRange,
  setCompareTimeRange,
  showBaseline,
  setShowBaseline,
}: QueryFormProps) {
  return (
    <div className="xl:sticky xl:top-4">
      <Selectors
        selectedOracles={selectedOracles}
        setSelectedOracles={setSelectedOracles}
        selectedChains={selectedChains}
        setSelectedChains={setSelectedChains}
        selectedSymbol={selectedSymbol}
        setSelectedSymbol={setSelectedSymbol}
        selectedTimeRange={selectedTimeRange}
        setSelectedTimeRange={setSelectedTimeRange}
        isLoading={isLoading}
        onQuery={onQuery}
        supportedChainsBySelectedOracles={supportedChainsBySelectedOracles}
        isCompareMode={isCompareMode}
        setIsCompareMode={setIsCompareMode}
        compareTimeRange={compareTimeRange}
        setCompareTimeRange={setCompareTimeRange}
        showBaseline={showBaseline}
        setShowBaseline={setShowBaseline}
      />
    </div>
  );
}
