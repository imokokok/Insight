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
  loading: boolean;
  onQuery: () => void;
  supportedChainsBySelectedOracles: Set<Blockchain>;
  compareMode: boolean;
  setCompareMode: (mode: boolean) => void;
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
  loading,
  onQuery,
  supportedChainsBySelectedOracles,
  compareMode,
  setCompareMode,
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
        loading={loading}
        onQuery={onQuery}
        supportedChainsBySelectedOracles={supportedChainsBySelectedOracles}
        compareMode={compareMode}
        setCompareMode={setCompareMode}
        compareTimeRange={compareTimeRange}
        setCompareTimeRange={setCompareTimeRange}
        showBaseline={showBaseline}
        setShowBaseline={setShowBaseline}
      />
    </div>
  );
}
