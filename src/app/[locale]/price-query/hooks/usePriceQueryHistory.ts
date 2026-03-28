'use client';

import { useState, useCallback, useEffect } from 'react';

import { OracleProvider, Blockchain } from '@/lib/oracles';
import { getQueryHistory, clearQueryHistory, type QueryHistoryItem } from '@/utils/queryHistory';

export interface UsePriceQueryHistoryParams {
  setSelectedOracles: (oracles: OracleProvider[]) => void;
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
  const { setSelectedOracles, setSelectedChains, setSelectedSymbol, setSelectedTimeRange } = params;

  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);

  const handleHistorySelect = useCallback(
    (item: QueryHistoryItem) => {
      setSelectedOracles(item.oracles);
      setSelectedChains(item.chains);
      setSelectedSymbol(item.symbol);
      setSelectedTimeRange(item.timeRange);
    },
    [setSelectedOracles, setSelectedChains, setSelectedSymbol, setSelectedTimeRange]
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
