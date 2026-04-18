/**
 * @fileoverview Common supported symbols hook
 * @description Logic for filtering commonly supported symbols based on selected oracles
 */

import { useMemo } from 'react';

import { tradingPairs } from '@/app/cross-oracle/constants';
import { oracleSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { OracleProvider } from '@/types/oracle';

/**
 * support
 */
interface CommonSymbolInfo {
  /** Symbol */
  symbol: string;
  /** Number of oracles supporting this symbol */
  oracleCount: number;
  /** List of oracles supporting this symbol */
  supportingOracles: OracleProvider[];
}

/**
 * Hook returnresult
 */
interface UseCommonSymbolsResult {
  commonSymbols: string[];
  commonSymbolDetails: CommonSymbolInfo[];
  oracleCountMap: Record<string, number>;
  unsupportedOracles: Record<string, OracleProvider[]>;
}

/**
 * OracleProvider to supportedSymbols key namemapping
 */
const providerToSymbolKey: Record<OracleProvider, keyof typeof oracleSupportedSymbols> = {
  [OracleProvider.CHAINLINK]: 'chainlink',
  [OracleProvider.PYTH]: 'pyth',
  [OracleProvider.API3]: 'api3',
  [OracleProvider.REDSTONE]: 'redstone',
  [OracleProvider.DIA]: 'dia',
  [OracleProvider.WINKLINK]: 'winklink',
  [OracleProvider.SUPRA]: 'supra',
  [OracleProvider.TWAP]: 'twap',
  [OracleProvider.REFLECTOR]: 'reflector',
  [OracleProvider.FLARE]: 'flare',
};

/**
 * filtersupport Hook
 * @param selectedOracles - List of selected oracles
 * @returns List of commonly supported symbols and related info
 */
export function useCommonSymbols(selectedOracles: OracleProvider[]): UseCommonSymbolsResult {
  return useMemo(() => {
    if (selectedOracles.length === 0) {
      return {
        commonSymbols: [],
        commonSymbolDetails: [],
        oracleCountMap: {},
        unsupportedOracles: {},
      };
    }

    const oracleSymbolSets = selectedOracles.map((oracle) => {
      const key = providerToSymbolKey[oracle];
      const symbols = oracleSupportedSymbols[key];
      return {
        oracle,
        symbols: new Set(symbols as readonly string[]),
      };
    });

    const allSymbolsSet = new Set<string>();
    oracleSymbolSets.forEach(({ symbols }) => {
      symbols.forEach((s) => allSymbolsSet.add(s));
    });

    const symbolSupportMap = new Map<string, OracleProvider[]>();

    allSymbolsSet.forEach((symbol) => {
      const supportingOracles: OracleProvider[] = [];

      oracleSymbolSets.forEach(({ oracle, symbols }) => {
        if (symbols.has(symbol)) {
          supportingOracles.push(oracle);
        }
      });

      symbolSupportMap.set(symbol, supportingOracles);
    });

    const maxOracleCount = Math.max(
      ...Array.from(symbolSupportMap.values()).map((o) => o.length),
      0
    );

    const commonSymbols: string[] = [];
    const commonSymbolDetails: CommonSymbolInfo[] = [];
    const oracleCountMap: Record<string, number> = {};
    const unsupportedOracles: Record<string, OracleProvider[]> = {};

    symbolSupportMap.forEach((supportingOracles, symbol) => {
      if (supportingOracles.length === maxOracleCount) {
        commonSymbols.push(symbol);
        commonSymbolDetails.push({
          symbol,
          oracleCount: supportingOracles.length,
          supportingOracles: [...supportingOracles],
        });
        oracleCountMap[symbol] = supportingOracles.length;
        unsupportedOracles[symbol] = selectedOracles.filter((o) => !supportingOracles.includes(o));
      }
    });

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
      unsupportedOracles,
    };
  }, [selectedOracles]);
}
