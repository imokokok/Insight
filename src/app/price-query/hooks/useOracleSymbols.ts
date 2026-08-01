import { useMemo, useCallback } from 'react';

import { useDynamicSymbols } from '@/hooks/data/useDynamicSymbols';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { createLogger } from '@/lib/utils/logger';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

const logger = createLogger('useOracleSymbols');

interface UseOracleSymbolsReturn {
  supportedSymbols: string[];
  isSymbolSupported: (symbol: string, chain?: Blockchain) => boolean;
  getSupportedChainsForSymbol: (symbol: string) => Blockchain[];
  getSymbolsForChain: (chain: Blockchain) => string[];
}

export function useOracleSymbols(selectedOracles: OracleProvider[]): UseOracleSymbolsReturn {
  const { symbols, oracleSymbols } = useDynamicSymbols();

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
        return selectedOracles.some((oracle) => {
          try {
            const client = getDefaultFactory().getClient(oracle);
            return client.isSymbolSupported(symbol, chain);
          } catch {
            logger.warn(`Failed to get supported chains for symbol on oracle`);
            return false;
          }
        });
      }

      return true;
    },
    [selectedOracles, oracleSymbols]
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
        } catch {
          logger.warn(`Failed to get supported chains for symbol`, { symbol, oracle });
        }
      });

      return Array.from(chainsSet);
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
        } catch {
          logger.warn(`Failed to get symbols for chain`, { chain, oracle });
        }
      });

      const result = Array.from(symbolsSet);
      const symbolOrder = new Map(symbols.map((s, i) => [s, i]));
      return result.sort((a, b) => {
        const orderA = symbolOrder.get(a) ?? Infinity;
        const orderB = symbolOrder.get(b) ?? Infinity;
        return orderA - orderB;
      });
    },
    [selectedOracles, symbols]
  );

  return {
    supportedSymbols,
    isSymbolSupported,
    getSupportedChainsForSymbol,
    getSymbolsForChain,
  };
}
