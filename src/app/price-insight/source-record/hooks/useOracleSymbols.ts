import { useMemo, useCallback } from 'react';

import { useDynamicSymbols } from '@/hooks/data/useDynamicSymbols';
import {
  getOracleChains,
  getOracleSymbolsForChain,
  isOracleSymbolSupported,
} from '@/lib/oracles/metadata';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

interface UseOracleSymbolsReturn {
  supportedSymbols: string[];
  isSymbolSupported: (symbol: string, chain?: Blockchain) => boolean;
  getSupportedChainsForSymbol: (symbol: string) => Blockchain[];
  getSymbolsForChain: (chain: Blockchain) => string[];
}

export function useOracleSymbols(selectedOracles: OracleProvider[]): UseOracleSymbolsReturn {
  const metadata = useDynamicSymbols();
  const { symbols, oracleSymbols } = metadata;

  const supportedSymbols = useMemo(() => {
    if (selectedOracles.length === 0) {
      return [];
    }

    const firstOracle = selectedOracles[0];
    const firstOracleSymbols = new Set(oracleSymbols[firstOracle] || []);

    let resultSymbols: string[];
    if (selectedOracles.length === 1) {
      resultSymbols = Array.from(firstOracleSymbols);
    } else {
      resultSymbols = selectedOracles.slice(1).reduce((commonSymbols, oracle) => {
        const oracleSyms = new Set(oracleSymbols[oracle] || []);
        return commonSymbols.filter((symbol) => oracleSyms.has(symbol));
      }, Array.from(firstOracleSymbols));
    }

    const symbolOrder = new Map(symbols.map((s, i) => [s, i]));
    return resultSymbols.sort((a, b) => {
      const orderA = symbolOrder.get(a) ?? Infinity;
      const orderB = symbolOrder.get(b) ?? Infinity;
      return orderA - orderB;
    });
  }, [selectedOracles, symbols, oracleSymbols]);

  const isSymbolSupported = useCallback(
    (symbol: string, chain?: Blockchain): boolean => {
      if (selectedOracles.length === 0) {
        return true;
      }

      const isSupportedByOracle = selectedOracles.some((oracle) => {
        const oracleSyms = oracleSymbols[oracle] || [];
        return (oracleSyms as readonly string[]).includes(symbol);
      });

      if (!isSupportedByOracle) return false;

      if (chain !== undefined) {
        return selectedOracles.some((oracle) =>
          isOracleSymbolSupported(metadata, oracle, symbol, chain)
        );
      }

      return true;
    },
    [selectedOracles, oracleSymbols, metadata]
  );

  const getSupportedChainsForSymbol = useCallback(
    (symbol: string): Blockchain[] => {
      if (selectedOracles.length === 0) {
        return [];
      }

      const chainsSet = new Set<Blockchain>();

      selectedOracles.forEach((oracle) => {
        getOracleChains(metadata, oracle).forEach((chain) => {
          if (isOracleSymbolSupported(metadata, oracle, symbol, chain)) chainsSet.add(chain);
        });
      });

      return Array.from(chainsSet);
    },
    [selectedOracles, metadata]
  );

  const getSymbolsForChain = useCallback(
    (chain: Blockchain): string[] => {
      if (selectedOracles.length === 0) {
        return [];
      }

      const symbolsSet = new Set<string>();

      selectedOracles.forEach((oracle) => {
        getOracleSymbolsForChain(metadata, oracle, chain).forEach((symbol) =>
          symbolsSet.add(symbol)
        );
      });

      const result = Array.from(symbolsSet);
      const symbolOrder = new Map(symbols.map((s, i) => [s, i]));
      return result.sort((a, b) => {
        const orderA = symbolOrder.get(a) ?? Infinity;
        const orderB = symbolOrder.get(b) ?? Infinity;
        return orderA - orderB;
      });
    },
    [selectedOracles, symbols, metadata]
  );

  return {
    supportedSymbols,
    isSymbolSupported,
    getSupportedChainsForSymbol,
    getSymbolsForChain,
  };
}
