import { useMemo } from 'react';

import { symbols } from '@/lib/constants';
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
  isSymbolSupported: (symbol: string, chain?: Blockchain) => boolean;
  // 获取指定币种支持的链
  getSupportedChainsForSymbol: (symbol: string) => Blockchain[];
  // 获取币种在指定预言机上支持的链
  getChainsForSymbolOnOracle: (symbol: string, oracle: OracleProvider) => Blockchain[];
  // 获取不支持指定币种的预言机列表
  getUnsupportedOraclesForSymbol: (symbol: string) => OracleProvider[];
  // 获取指定链支持的所有币种
  getSymbolsForChain: (chain: Blockchain) => string[];
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

    let resultSymbols: string[];
    if (selectedOracles.length === 1) {
      resultSymbols = Array.from(firstOracleSymbols);
    } else {
      // 多个预言机时，返回共同支持的币种（交集）
      resultSymbols = selectedOracles.slice(1).reduce((commonSymbols, oracle) => {
        const oracleSymbols = new Set(
          oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || []
        );
        return commonSymbols.filter((symbol) => oracleSymbols.has(symbol));
      }, Array.from(firstOracleSymbols));
    }

    // 按照全局 symbols 数组的顺序排序（市值从高到低）
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

  const isSymbolSupportedByAllOracles = useMemo(() => {
    return (symbol: string): boolean => {
      if (selectedOracles.length === 0) {
        return false;
      }
      return selectedOracles.every((oracle) => {
        const oracleSyms =
          oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || [];
        return oracleSyms.includes(symbol as never);
      });
    };
  }, [selectedOracles]);

  const isSymbolSupported = useMemo(() => {
    return (symbol: string, chain?: Blockchain): boolean => {
      if (selectedOracles.length === 0) {
        return true;
      }

      // 单选模式下，检查币种是否被选中的预言机支持
      const isSupportedByOracle = selectedOracles.some((oracle) => {
        const oracleSyms =
          oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || [];
        return oracleSyms.includes(symbol as never);
      });

      if (!isSupportedByOracle) return false;

      // 如果指定了链，检查该币种是否在该链上支持
      if (chain !== undefined) {
        return selectedOracles.some((oracle) => {
          try {
            const client = OracleClientFactory.getClient(oracle);
            return client.isSymbolSupported(symbol, chain);
          } catch {
            return false;
          }
        });
      }

      return true;
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
        const oracleSyms =
          oracleSupportedSymbols[oracle as keyof typeof oracleSupportedSymbols] || [];
        return !oracleSyms.includes(symbol as never);
      });
    };
  }, [selectedOracles]);

  // 新增：获取指定链支持的所有币种
  const getSymbolsForChain = useMemo(() => {
    return (chain: Blockchain): string[] => {
      if (selectedOracles.length === 0) {
        return [];
      }

      const symbolsSet = new Set<string>();

      selectedOracles.forEach((oracle) => {
        try {
          const client = OracleClientFactory.getClient(oracle);
          // 使用客户端的 getSupportedSymbolsForChain 方法（如果存在）
          if ('getSupportedSymbolsForChain' in client) {
            const chainSymbols = (
              client as { getSupportedSymbolsForChain: (chain: Blockchain) => string[] }
            ).getSupportedSymbolsForChain(chain);
            chainSymbols.forEach((symbol) => symbolsSet.add(symbol));
          } else {
            // 回退：检查每个币种是否在该链上支持
            const allSymbols = client.getSupportedSymbols();
            allSymbols.forEach((symbol) => {
              if (client.isSymbolSupported(symbol, chain)) {
                symbolsSet.add(symbol);
              }
            });
          }
        } catch {
          // 如果客户端获取失败，跳过该预言机
        }
      });

      // 按照全局 symbols 数组的顺序排序
      const result = Array.from(symbolsSet);
      const symbolOrder = new Map(symbols.map((s, i) => [s, i]));
      return result.sort((a, b) => {
        const orderA = symbolOrder.get(a) ?? Infinity;
        const orderB = symbolOrder.get(b) ?? Infinity;
        return orderA - orderB;
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
    getSymbolsForChain,
  };
}

export default useOracleSymbols;
