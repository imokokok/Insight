'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import { usePreferences } from '@/hooks';
import { getDefaultFactory } from '@/lib/oracles';
import { oracleSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { parseQueryParams, updateUrlParams, type QueryConfig } from '@/lib/utils/urlParams';
import { OracleProvider, Blockchain } from '@/types/oracle';

interface UsePriceQueryStateReturn {
  selectedOracle: OracleProvider | null;
  setSelectedOracle: (oracle: OracleProvider | null) => void;
  selectedChain: Blockchain | null;
  setSelectedChain: (chain: Blockchain | null) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  isCompareMode: boolean;
  setIsCompareMode: (mode: boolean) => void;
  showBaseline: boolean;
  setShowBaseline: (show: boolean) => void;
  urlParamsParsed: boolean;
}

function getFirstSupportedChain(oracle: OracleProvider): Blockchain | null {
  try {
    const client = getDefaultFactory().getClient(oracle);
    const chains = client.supportedChains;
    return chains.length > 0 ? chains[0] : null;
  } catch {
    return null;
  }
}

function getFirstSupportedSymbol(oracle: OracleProvider, chain: Blockchain): string {
  const symbols = oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] as
    | readonly string[]
    | undefined;
  if (!symbols || symbols.length === 0) return 'BTC';

  try {
    const client = getDefaultFactory().getClient(oracle);
    for (const symbol of symbols) {
      if (client.isSymbolSupported(symbol, chain)) {
        return symbol;
      }
    }
  } catch {
    // fallback to first symbol in list
  }

  return symbols[0];
}

export function usePriceQueryState(): UsePriceQueryStateReturn {
  const { preferences } = usePreferences();

  const [selectedOracle, _setSelectedOracle] = useState<OracleProvider | null>(null);
  const [selectedChain, _setSelectedChain] = useState<Blockchain | null>(null);
  const [selectedSymbol, _setSelectedSymbol] = useState<string>('');
  const [selectedTimeRange, _setSelectedTimeRange] = useState<number>(24);
  const [isCompareMode, _setIsCompareMode] = useState<boolean>(false);
  const [compareTimeRange, _setCompareTimeRange] = useState<number>(24);
  const [showBaseline, setShowBaseline] = useState<boolean>(false);
  const [urlParamsParsed, setUrlParamsParsed] = useState(false);
  const hasInitializedRef = useRef(false);

  const selectedOracleRef = useRef<OracleProvider | null>(OracleProvider.CHAINLINK);
  const selectedChainRef = useRef<Blockchain | null>(Blockchain.ETHEREUM);
  const selectedSymbolRef = useRef<string>('BTC');
  const selectedTimeRangeRef = useRef<number>(24);
  const isCompareModeRef = useRef<boolean>(false);

  const setSelectedOracle = useCallback((oracle: OracleProvider | null) => {
    selectedOracleRef.current = oracle;
    _setSelectedOracle(oracle);
  }, []);

  const setSelectedChain = useCallback((chain: Blockchain | null) => {
    selectedChainRef.current = chain;
    _setSelectedChain(chain);
  }, []);

  const setSelectedSymbol = useCallback((symbol: string) => {
    selectedSymbolRef.current = symbol;
    _setSelectedSymbol(symbol);
  }, []);

  const setSelectedTimeRange = useCallback((timeRange: number) => {
    selectedTimeRangeRef.current = timeRange;
    _setSelectedTimeRange(timeRange);
  }, []);

  const setIsCompareMode = useCallback((mode: boolean) => {
    isCompareModeRef.current = mode;
    _setIsCompareMode(mode);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const config = parseQueryParams(window.location.search);

    const hasUrlParams =
      config.oracles?.length || config.chains?.length || config.symbol || config.timeRange;

    if (!hasUrlParams) {
      const oracleMapping: Record<string, OracleProvider> = {
        chainlink: OracleProvider.CHAINLINK,
        pyth: OracleProvider.PYTH,
        api3: OracleProvider.API3,
        redstone: OracleProvider.REDSTONE,
        dia: OracleProvider.DIA,
        winklink: OracleProvider.WINKLINK,
        supra: OracleProvider.SUPRA,
      };

      const timeRangeMapping: Record<string, number> = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 168,
      };

      const defaultOracle = oracleMapping[preferences.defaultOracle] || OracleProvider.CHAINLINK;
      const defaultTimeRange = timeRangeMapping[preferences.defaultTimeRange] || 24;

      // Auto-select first supported chain and symbol for the default oracle
      const defaultChain = getFirstSupportedChain(defaultOracle);
      const defaultSymbol = defaultChain
        ? getFirstSupportedSymbol(defaultOracle, defaultChain)
        : 'BTC';

      selectedOracleRef.current = defaultOracle;
      selectedChainRef.current = defaultChain;
      selectedSymbolRef.current = defaultSymbol;
      selectedTimeRangeRef.current = defaultTimeRange;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time initialization from preferences
      setSelectedOracle(defaultOracle);

      setSelectedChain(defaultChain);

      setSelectedSymbol(defaultSymbol);
      setSelectedTimeRange(defaultTimeRange);
      setUrlParamsParsed(true);
    } else {
      const oracleFromUrl =
        config.oracles && config.oracles.length > 0 ? config.oracles[0] : selectedOracleRef.current;
      const chainFromUrl =
        config.chains && config.chains.length > 0 ? config.chains[0] : selectedChainRef.current;
      const symbolFromUrl = config.symbol || selectedSymbolRef.current;
      const timeRangeFromUrl = config.timeRange || selectedTimeRangeRef.current;

      selectedOracleRef.current = oracleFromUrl;
      selectedChainRef.current = chainFromUrl;
      selectedSymbolRef.current = symbolFromUrl;
      selectedTimeRangeRef.current = timeRangeFromUrl;

      setSelectedOracle(oracleFromUrl);
      setSelectedChain(chainFromUrl);
      setSelectedSymbol(symbolFromUrl);
      setSelectedTimeRange(timeRangeFromUrl);
      setUrlParamsParsed(true);
    }
  }, [
    preferences.defaultOracle,
    preferences.defaultTimeRange,
    preferences.defaultSymbol,
    setSelectedOracle,
    setSelectedChain,
    setSelectedSymbol,
    setSelectedTimeRange,
  ]);

  useEffect(() => {
    if (!urlParamsParsed) return;
    const config: QueryConfig = {
      oracles: selectedOracle ? [selectedOracle] : [],
      chains: selectedChain ? [selectedChain] : [],
      symbol: selectedSymbol,
      timeRange: selectedTimeRange,
      isCompareMode,
      compareTimeRange,
    };
    updateUrlParams(config);
  }, [
    selectedOracle,
    selectedChain,
    selectedSymbol,
    selectedTimeRange,
    urlParamsParsed,
    isCompareMode,
    compareTimeRange,
  ]);

  return {
    selectedOracle,
    setSelectedOracle,
    selectedChain,
    setSelectedChain,
    selectedSymbol,
    setSelectedSymbol,
    isCompareMode,
    setIsCompareMode,
    showBaseline,
    setShowBaseline,
    urlParamsParsed,
  };
}
