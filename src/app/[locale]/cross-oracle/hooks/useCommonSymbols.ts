/**
 * @fileoverview 共同支持币种 Hook
 * @description 根据已选预言机筛选共同支持币种的逻辑
 */

import { useMemo } from 'react';

import { tradingPairs } from '@/app/[locale]/cross-oracle/constants';
import { oracleSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { OracleProvider } from '@/types/oracle';

/**
 * 共同支持币种信息
 */
export interface CommonSymbolInfo {
  /** 币种符号 */
  symbol: string;
  /** 支持该币种的预言机数量 */
  oracleCount: number;
  /** 支持该币种的预言机列表 */
  supportingOracles: OracleProvider[];
}

/**
 * Hook 返回结果
 */
export interface UseCommonSymbolsResult {
  /** 共同支持的币种列表 */
  commonSymbols: string[];
  /** 详细的共同支持币种信息 */
  commonSymbolDetails: CommonSymbolInfo[];
  /** 每个币种支持的预言机数量映射 */
  oracleCountMap: Record<string, number>;
}

/**
 * OracleProvider 到 supportedSymbols 键名的映射
 */
const providerToSymbolKey: Record<OracleProvider, keyof typeof oracleSupportedSymbols> = {
  [OracleProvider.CHAINLINK]: 'chainlink',
  [OracleProvider.PYTH]: 'pyth',
  [OracleProvider.API3]: 'api3',
  [OracleProvider.REDSTONE]: 'redstone',
  [OracleProvider.DIA]: 'dia',
  [OracleProvider.WINKLINK]: 'winklink',
};

/**
 * 根据已选预言机筛选共同支持币种的 Hook
 * @param selectedOracles - 已选的预言机列表
 * @returns 共同支持的币种列表和相关信息
 */
export function useCommonSymbols(selectedOracles: OracleProvider[]): UseCommonSymbolsResult {
  return useMemo(() => {
    // 如果没有选择任何预言机，返回空结果
    if (selectedOracles.length === 0) {
      return {
        commonSymbols: [],
        commonSymbolDetails: [],
        oracleCountMap: {},
      };
    }

    // 获取每个预言机支持的币种集合
    const oracleSymbolSets = selectedOracles.map((oracle) => {
      const key = providerToSymbolKey[oracle];
      const symbols = oracleSupportedSymbols[key];
      return {
        oracle,
        symbols: new Set(symbols as readonly string[]),
      };
    });

    // 获取第一个预言机的币种作为基础集合
    const baseSymbols = oracleSymbolSets[0].symbols;

    // 计算每个币种被多少个已选预言机支持
    const symbolSupportMap = new Map<string, OracleProvider[]>();

    baseSymbols.forEach((symbol) => {
      const supportingOracles: OracleProvider[] = [];

      oracleSymbolSets.forEach(({ oracle, symbols }) => {
        if (symbols.has(symbol)) {
          supportingOracles.push(oracle);
        }
      });

      // 只记录被所有已选预言机支持的币种
      if (supportingOracles.length === selectedOracles.length) {
        symbolSupportMap.set(symbol, supportingOracles);
      }
    });

    // 构建返回结果
    const commonSymbols: string[] = [];
    const commonSymbolDetails: CommonSymbolInfo[] = [];
    const oracleCountMap: Record<string, number> = {};

    symbolSupportMap.forEach((supportingOracles, symbol) => {
      commonSymbols.push(symbol);
      commonSymbolDetails.push({
        symbol,
        oracleCount: supportingOracles.length,
        supportingOracles: [...supportingOracles],
      });
      oracleCountMap[symbol] = supportingOracles.length;
    });

    // 按 tradingPairs 中的顺序排序（靠前的市值更高）
    const getMarketCapRank = (symbol: string): number => {
      const index = tradingPairs.findIndex((p) => p === symbol);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };

    commonSymbols.sort((a, b) => getMarketCapRank(a) - getMarketCapRank(b));
    commonSymbolDetails.sort((a, b) => getMarketCapRank(a.symbol) - getMarketCapRank(b.symbol));

    return {
      commonSymbols,
      commonSymbolDetails,
      oracleCountMap,
    };
  }, [selectedOracles]);
}

export default useCommonSymbols;
