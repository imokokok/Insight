/**
 * @fileoverview Common supported symbols hook
 * @description Logic for filtering commonly supported symbols based on selected oracles
 */

import { useMemo } from 'react';

import { tradingPairs } from '@/app/cross-oracle/constants';
import { oracleSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { OracleProvider } from '@/types/oracle';

interface CommonSymbolInfo {
  symbol: string;
  oracleCount: number;
  supportingOracles: OracleProvider[];
}

interface UseCommonSymbolsResult {
  commonSymbols: string[];
  commonSymbolDetails: CommonSymbolInfo[];
  oracleCountMap: Record<string, number>;
  unsupportedOracles: Record<string, OracleProvider[]>;
}

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

    const commonSymbols: string[] = [];
    const commonSymbolDetails: CommonSymbolInfo[] = [];
    const oracleCountMap: Record<string, number> = {};
    const unsupportedOracles: Record<string, OracleProvider[]> = {};

    const firstSet = oracleSymbolSets[0].symbols;

    firstSet.forEach((symbol) => {
      const supportingOracles: OracleProvider[] = [oracleSymbolSets[0].oracle];

      for (let i = 1; i < oracleSymbolSets.length; i++) {
        if (oracleSymbolSets[i].symbols.has(symbol)) {
          supportingOracles.push(oracleSymbolSets[i].oracle);
        }
      }

      if (supportingOracles.length === selectedOracles.length) {
        commonSymbols.push(symbol);
        commonSymbolDetails.push({
          symbol,
          oracleCount: supportingOracles.length,
          supportingOracles: [...supportingOracles],
        });
        oracleCountMap[symbol] = supportingOracles.length;
        unsupportedOracles[symbol] = [];
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
