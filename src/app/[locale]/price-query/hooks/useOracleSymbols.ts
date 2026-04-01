import { useMemo } from 'react';

import { OracleClientFactory } from '@/lib/oracles/factory';
import { oracleSupportedSymbols } from '@/lib/oracles/supportedSymbols';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

export interface UseOracleSymbolsReturn {
  // 获取选中预言机支持的所有币种
  supportedSymbols: string[];
  // 获取所有币种的并集（带预言机标识）
  allSymbolsWithOracles: Array<{ symbol: string; oracles: OracleProvider[] }>;
  // 检查币种是否被所有选中预言机支持（多选模式）
  isSymbolSupportedByAllOracles: (symbol: string) => boolean;
  // 检查币种是否被选中预言机支持（单选模式）
  isSymbolSupported: (symbol: string) => boolean;
  // 获取指定币种支持的链
  getSupportedChainsForSymbol: (symbol: string) => Blockchain[];
  // 获取币种在指定预言机上支持的链
  getChainsForSymbolOnOracle: (symbol: string, oracle: OracleProvider) => Blockchain[];
  // 获取不支持指定币种的预言机列表
  getUnsupportedOraclesForSymbol: (symbol: string) => OracleProvider[];
}

export function useOracleSymbols(selectedOracles: OracleProvider[]): UseOracleSymbolsReturn {
  const supportedSymbols = useMemo(() => {
    if (selectedOracles.length === 0) {
      return [];
    }

    // 获取第一个预言机支持的币种作为初始集合
    const firstOracle = selectedOracles[0];
    const firstOracleSymbols = new Set(
      oracleSupportedSymbols[firstOracle as keyof typeof oracleSupportedSymbols] || []
    );

    if (selectedOracles.length === 1) {
      return Array.from(firstOracleSymbols);
    }

    // 多个预言机时，返回共同支持的币种（交集）
    return selectedOracles.slice(1).reduce((commonSymbols, oracle) => {
      const oracleSymbols = new Set(
        oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || []
      );
      return commonSymbols.filter((symbol) => oracleSymbols.has(symbol));
    }, Array.from(firstOracleSymbols));
  }, [selectedOracles]);

  const allSymbolsWithOracles = useMemo(() => {
    const symbolToOracles = new Map<string, OracleProvider[]>();

    selectedOracles.forEach((oracle) => {
      const symbols = oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || [];
      symbols.forEach((symbol) => {
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

  const isSymbolSupportedByAllOracles = useMemo(() => {
    return (symbol: string): boolean => {
      if (selectedOracles.length === 0) {
        return false;
      }
      return selectedOracles.every((oracle) => {
        const symbols = oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || [];
        return symbols.includes(symbol as never);
      });
    };
  }, [selectedOracles]);

  const isSymbolSupported = useMemo(() => {
    return (symbol: string): boolean => {
      if (selectedOracles.length === 0) {
        return true;
      }
      // 单选模式下，检查币种是否被选中的预言机支持
      return selectedOracles.some((oracle) => {
        const symbols = oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || [];
        return symbols.includes(symbol as never);
      });
    };
  }, [selectedOracles]);

  const getSupportedChainsForSymbol = useMemo(() => {
    return (symbol: string): Blockchain[] => {
      if (selectedOracles.length === 0) {
        return [];
      }

      const chainsSet = new Set<Blockchain>();

      selectedOracles.forEach((oracle) => {
        try {
          const client = OracleClientFactory.getClient(oracle);
          if (client.isSymbolSupported(symbol)) {
            client.supportedChains.forEach((chain) => chainsSet.add(chain));
          }
        } catch {
          // 如果客户端获取失败，跳过该预言机
        }
      });

      return Array.from(chainsSet);
    };
  }, [selectedOracles]);

  const getChainsForSymbolOnOracle = useMemo(() => {
    return (symbol: string, oracle: OracleProvider): Blockchain[] => {
      try {
        const client = OracleClientFactory.getClient(oracle);
        if (!client.isSymbolSupported(symbol)) {
          return [];
        }
        return client.getSupportedChainsForSymbol(symbol);
      } catch {
        return [];
      }
    };
  }, []);

  const getUnsupportedOraclesForSymbol = useMemo(() => {
    return (symbol: string): OracleProvider[] => {
      if (selectedOracles.length === 0) {
        return [];
      }
      return selectedOracles.filter((oracle) => {
        const symbols = oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || [];
        return !symbols.includes(symbol as never);
      });
    };
  }, [selectedOracles]);

  return {
    supportedSymbols,
    allSymbolsWithOracles,
    isSymbolSupportedByAllOracles,
    isSymbolSupported,
    getSupportedChainsForSymbol,
    getChainsForSymbolOnOracle,
    getUnsupportedOraclesForSymbol,
  };
}

export default useOracleSymbols;
