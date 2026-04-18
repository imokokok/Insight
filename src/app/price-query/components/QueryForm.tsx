'use client';

import { type OracleProvider, type Blockchain } from '@/types/oracle';

import { Selectors } from './Selectors';

interface QueryFormProps {
  selectedOracle: OracleProvider | null;
  setSelectedOracle: (oracle: OracleProvider | null) => void;
  selectedChain: Blockchain | null;
  setSelectedChain: (chain: Blockchain | null) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (timeRange: number) => void;
  isLoading: boolean;
  onQuery: () => void;
  supportedChainsBySelectedOracles: Set<Blockchain>;
}

export function QueryForm({
  selectedOracle,
  setSelectedOracle,
  selectedChain,
  setSelectedChain,
  selectedSymbol,
  setSelectedSymbol,
  selectedTimeRange,
  setSelectedTimeRange,
  isLoading,
  onQuery,
  supportedChainsBySelectedOracles,
}: QueryFormProps) {
  return (
    <div className="xl:sticky xl:top-4">
      <Selectors
        selectedOracle={selectedOracle}
        setSelectedOracle={setSelectedOracle}
        selectedChain={selectedChain}
        setSelectedChain={setSelectedChain}
        selectedSymbol={selectedSymbol}
        setSelectedSymbol={setSelectedSymbol}
        selectedTimeRange={selectedTimeRange}
        setSelectedTimeRange={setSelectedTimeRange}
        isLoading={isLoading}
        onQuery={onQuery}
        supportedChainsBySelectedOracles={supportedChainsBySelectedOracles}
      />
    </div>
  );
}
