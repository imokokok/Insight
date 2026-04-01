'use client';

import { useState, useCallback, useEffect } from 'react';

import { type OracleProvider, type Blockchain } from '@/lib/oracles';
import { getQueryHistory, clearQueryHistory, type QueryHistoryItem } from '@/utils/queryHistory';

export interface UsePriceQueryHistoryParams {
  setSelectedOracle: (oracle: OracleProvider | null) => void;
  setSelectedChains: (chains: Blockchain[]) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeRange: (timeRange: number) => void;
}

export interface UsePriceQueryHistoryReturn {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  historyItems: QueryHistoryItem[];
  handleHistorySelect: (item: QueryHistoryItem) => void;
  handleClearHistory: () => void;
}

export function usePriceQueryHistory(
  params: UsePriceQueryHistoryParams
): UsePriceQueryHistoryReturn {
  const { setSelectedOracle, setSelectedChains, setSelectedSymbol, setSelectedTimeRange } = params;

  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);

  const handleHistorySelect = useCallback(
    (item: QueryHistoryItem) => {
      setSelectedOracle(item.oracles.length > 0 ? item.oracles[0] : null);
      setSelectedChains(item.chains);
      setSelectedSymbol(item.symbol);
      setSelectedTimeRange(item.timeRange);
    },
    [setSelectedOracle, setSelectedChains, setSelectedSymbol, setSelectedTimeRange]
  );

  const handleClearHistory = useCallback(() => {
    clearQueryHistory();
    setHistoryItems([]);
  }, []);

  useEffect(() => {
    setHistoryItems(getQueryHistory());
  }, []);

  return {
    showHistory,
    setShowHistory,
    historyItems,
    handleHistorySelect,
    handleClearHistory,
  };
}
