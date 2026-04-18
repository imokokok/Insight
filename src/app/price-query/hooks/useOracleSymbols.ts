import { useMemo, useCallback } from 'react';

import { symbols } from '@/lib/constants';
import { oracleSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

interface UseOracleSymbolsReturn {
  supportedSymbols: string[];
  allSymbolsWithOracles: Array<{ symbol: string; oracles: OracleProvider[] }>;
  isSymbolSupportedByAllOracles: (symbol: string) => boolean;
  isSymbolSupported: (symbol: string, chain?: Blockchain) => boolean;
  getSupportedChainsForSymbol: (symbol: string) => Blockchain[];
  getChainsForSymbolOnOracle: (symbol: string, oracle: OracleProvider) => Blockchain[];
  getUnsupportedOraclesForSymbol: (symbol: string) => OracleProvider[];
  getSymbolsForChain: (chain: Blockchain) => string[];
}

export function useOracleSymbols(selectedOracles: OracleProvider[]): UseOracleSymbolsReturn {
  const supportedSymbols = useMemo(() => {
    if (selectedOracles.length === 0) {
      return [];
    }

    const firstOracle = selectedOracles[0];
    const firstOracleSymbols = new Set(
      oracleSupportedSymbols[firstOracle as keyof typeof oracleSupportedSymbols] || []
    );

    let resultSymbols: string[];
    if (selectedOracles.length === 1) {
      resultSymbols = Array.from(firstOracleSymbols);
    } else {
      resultSymbols = selectedOracles.slice(1).reduce((commonSymbols, oracle) => {
        const oracleSymbols = new Set(
          oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || []
        );
        return commonSymbols.filter((symbol) => oracleSymbols.has(symbol));
      }, Array.from(firstOracleSymbols));
    }

    const symbolOrder = new Map(symbols.map((s, i) => [s, i]));
    return resultSymbols.sort((a, b) => {
      const orderA = symbolOrder.get(a) ?? Infinity;
      const orderB = symbolOrder.get(b) ?? Infinity;
      return orderA - orderB;
    });
  }, [selectedOracles]);

  const allSymbolsWithOracles = useMemo(() => {
    const symbolToOracles = new Map<string, OracleProvider[]>();

    selectedOracles.forEach((oracle) => {
      const oracleSyms =
        oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || [];
      oracleSyms.forEach((symbol) => {
        if (!symbolToOracles.has(symbol)) {
          symbolToOracles.set(symbol, []);
        }
        symbolToOracles.get(symbol)!.push(oracle);
      });
    });

    return Array.from(symbolToOracles.entries())
      .map(([symbol, oracles]) => ({
        symbol,
        oracles,
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [selectedOracles]);

  const isSymbolSupportedByAllOracles = useCallback(
    (symbol: string): boolean => {
      if (selectedOracles.length === 0) {
        return false;
      }
      return selectedOracles.every((oracle) => {
        const oracleSyms =
          oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || [];
        return oracleSyms.includes(symbol as never);
      });
    },
    [selectedOracles]
  );

  const isSymbolSupported = useCallback(
    (symbol: string, chain?: Blockchain): boolean => {
      if (selectedOracles.length === 0) {
        return true;
      }

      const isSupportedByOracle = selectedOracles.some((oracle) => {
        const oracleSyms =
          oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || [];
        return oracleSyms.includes(symbol as never);
      });

      if (!isSupportedByOracle) return false;

      if (chain !== undefined) {
        return selectedOracles.some((oracle) => {
          try {
            const client = getDefaultFactory().getClient(oracle);
            return client.isSymbolSupported(symbol, chain);
          } catch {
            return false;
          }
        });
      }

      return true;
    },
    [selectedOracles]
  );

  const getSupportedChainsForSymbol = useCallback(
    (symbol: string): Blockchain[] => {
      if (selectedOracles.length === 0) {
        return [];
      }

      const chainsSet = new Set<Blockchain>();

      selectedOracles.forEach((oracle) => {
        try {
          const client = getDefaultFactory().getClient(oracle);
          if (client.isSymbolSupported(symbol)) {
            client.supportedChains.forEach((chain) => chainsSet.add(chain));
          }
        } catch {}
      });

      return Array.from(chainsSet);
    },
    [selectedOracles]
  );

  const getChainsForSymbolOnOracle = useCallback(
    (symbol: string, oracle: OracleProvider): Blockchain[] => {
      try {
        const client = getDefaultFactory().getClient(oracle);
        if (!client.isSymbolSupported(symbol)) {
          return [];
        }
        return client.getSupportedChainsForSymbol(symbol);
      } catch {
        return [];
      }
    },
    []
  );

  const getUnsupportedOraclesForSymbol = useCallback(
    (symbol: string): OracleProvider[] => {
      if (selectedOracles.length === 0) {
        return [];
      }
      return selectedOracles.filter((oracle) => {
        const oracleSyms =
          oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || [];
        return !oracleSyms.includes(symbol as never);
      });
    },
    [selectedOracles]
  );

  const getSymbolsForChain = useCallback(
    (chain: Blockchain): string[] => {
      if (selectedOracles.length === 0) {
        return [];
      }

      const symbolsSet = new Set<string>();

      selectedOracles.forEach((oracle) => {
        try {
          const client = getDefaultFactory().getClient(oracle);
          if ('getSupportedSymbolsForChain' in client) {
            const chainSymbols = (
              client as { getSupportedSymbolsForChain: (chain: Blockchain) => string[] }
            ).getSupportedSymbolsForChain(chain);
            chainSymbols.forEach((symbol) => symbolsSet.add(symbol));
          } else {
            const allSymbols = client.getSupportedSymbols();
            allSymbols.forEach((symbol) => {
              if (client.isSymbolSupported(symbol, chain)) {
                symbolsSet.add(symbol);
              }
            });
          }
        } catch {}
      });

      const result = Array.from(symbolsSet);
      const symbolOrder = new Map(symbols.map((s, i) => [s, i]));
      return result.sort((a, b) => {
        const orderA = symbolOrder.get(a) ?? Infinity;
        const orderB = symbolOrder.get(b) ?? Infinity;
        return orderA - orderB;
      });
    },
    [selectedOracles]
  );

  return {
    supportedSymbols,
    allSymbolsWithOracles,
    isSymbolSupportedByAllOracles,
    isSymbolSupported,
    getSupportedChainsForSymbol,
    getChainsForSymbolOnOracle,
    getUnsupportedOraclesForSymbol,
    getSymbolsForChain,
  };
}
