'use client';

import { useMemo } from 'react';

import { Search, RefreshCw } from 'lucide-react';

import { DropdownSelect, type SelectorOption } from '@/components/ui';
import { useDynamicSymbols } from '@/hooks/data/useDynamicSymbols';
import { symbols, oracleColors, chainColors } from '@/lib/constants';
import { getAssetClass, ASSET_CLASS_CATEGORIES } from '@/lib/oracles/constants/supportedSymbols';
import {
  getOracleChains,
  isOracleSymbolSupported,
  PRICE_ORACLE_ORDER,
  type OracleMetadata,
} from '@/lib/oracles/metadata';
import { type OracleProvider, type Blockchain, BLOCKCHAIN_VALUES } from '@/types/oracle';

import { useQueryData, useQueryParams } from '../contexts';
import { useOracleSymbols } from '../hooks/useOracleSymbols';

import { AutoRefreshControl } from './AutoRefreshControl';

function getFirstSupportedChain(
  oracle: OracleProvider,
  metadata: OracleMetadata
): Blockchain | null {
  return getOracleChains(metadata, oracle)[0] ?? null;
}

function getFirstSupportedSymbol(
  oracle: OracleProvider,
  chain: Blockchain,
  allSymbols: string[],
  metadata: OracleMetadata
): string {
  for (const symbol of allSymbols) {
    if (isOracleSymbolSupported(metadata, oracle, symbol, chain)) {
      return symbol;
    }
  }
  return allSymbols[0] || 'BTC';
}

export function Selectors() {
  const {
    selectedOracle,
    setSelectedOracle,
    selectedChain,
    setSelectedChain,
    selectedSymbol,
    setSelectedSymbol,
    supportedChainsBySelectedOracles,
  } = useQueryParams();
  const { isLoading, refetch, autoRefresh } = useQueryData();
  const metadata = useDynamicSymbols();
  const { symbols: dynamicSymbols, categories } = metadata;

  const {
    supportedSymbols,
    isSymbolSupported,
    getSupportedChainsForSymbol: _getSupportedChainsForSymbol,
    getSymbolsForChain,
  } = useOracleSymbols(selectedOracle ? [selectedOracle] : []);

  const chainOptions: SelectorOption<Blockchain>[] = useMemo(() => {
    let availableChains: Blockchain[];

    if (!selectedOracle) {
      availableChains = [...BLOCKCHAIN_VALUES];
    } else {
      availableChains = BLOCKCHAIN_VALUES.filter((chain) =>
        supportedChainsBySelectedOracles.has(chain)
      );
    }

    return availableChains.map((chain) => ({
      value: chain,
      label: chain,
      color: chainColors[chain],
      icon: (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: chainColors[chain] }}
        />
      ),
    }));
  }, [selectedOracle, supportedChainsBySelectedOracles]);

  const symbolOptions: SelectorOption<string>[] = useMemo(() => {
    let availableSymbols: string[];

    if (!selectedOracle) {
      availableSymbols = dynamicSymbols.length > 0 ? dynamicSymbols : symbols;
    } else if (selectedChain) {
      availableSymbols = getSymbolsForChain(selectedChain);
    } else {
      availableSymbols = supportedSymbols;
    }

    return availableSymbols.map((symbol) => ({
      value: symbol,
      label: symbol,
      category: categories[symbol] || getAssetClass(symbol),
    }));
  }, [
    selectedOracle,
    selectedChain,
    supportedSymbols,
    getSymbolsForChain,
    dynamicSymbols,
    categories,
  ]);

  const oracleOptions: SelectorOption<OracleProvider>[] = PRICE_ORACLE_ORDER.map((oracle) => ({
    value: oracle,
    label: oracle,
    color: oracleColors[oracle],
    icon: (
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: oracleColors[oracle] }}
      />
    ),
  }));

  return (
    <div
      className="editorial-panel border-y border-slate-900/15 bg-white/35"
      role="region"
      aria-label="Price query selectors"
    >
      <div className="px-4 py-4 border-b border-slate-900/10 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-blue-700" aria-hidden="true" />
          Query parameters
        </h2>
        <button
          onClick={refetch}
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label={isLoading ? 'Loading...' : 'Query'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-950 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isLoading ? (
            <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
          )}
          {isLoading ? 'Loading...' : 'Query'}
        </button>
      </div>

      <div className="p-4">
        <section className="py-3 first:pt-0" aria-labelledby="oracle-label">
          <label className="block text-xs font-medium text-slate-700 mb-2">Oracle</label>
          <DropdownSelect
            options={oracleOptions}
            value={selectedOracle}
            onChange={(value) => {
              const newOracle = value as OracleProvider;
              setSelectedOracle(newOracle);
              // Auto-select first supported chain and symbol for the new oracle
              const firstChain = getFirstSupportedChain(newOracle, metadata);
              setSelectedChain(firstChain);
              if (firstChain) {
                const firstSymbol = getFirstSupportedSymbol(
                  newOracle,
                  firstChain,
                  dynamicSymbols.length > 0 ? dynamicSymbols : symbols,
                  metadata
                );
                setSelectedSymbol(firstSymbol);
              } else {
                setSelectedSymbol('');
              }
            }}
            placeholder="Select oracle"
          />
        </section>

        <section className="py-3 border-t border-slate-900/10" aria-labelledby="blockchain-label">
          <label className="block text-xs font-medium text-slate-700 mb-2">
            Blockchain
            {!selectedOracle && (
              <span className="ml-1.5 text-[10px] text-amber-600 font-normal">
                (Select oracle first)
              </span>
            )}
          </label>
          <DropdownSelect
            options={chainOptions}
            value={selectedChain}
            onChange={(value) => {
              const newChain = value as Blockchain;
              setSelectedChain(newChain);
              if (newChain && selectedSymbol && !isSymbolSupported(selectedSymbol, newChain)) {
                // Auto-select first supported symbol for the new chain
                if (selectedOracle) {
                  const firstSymbol = getFirstSupportedSymbol(
                    selectedOracle,
                    newChain,
                    dynamicSymbols.length > 0 ? dynamicSymbols : symbols,
                    metadata
                  );
                  setSelectedSymbol(firstSymbol);
                } else {
                  setSelectedSymbol('');
                }
              }
            }}
            placeholder={selectedOracle ? 'Select blockchain' : 'Select oracle first'}
            disabled={!selectedOracle}
          />
        </section>

        <section className="py-3 border-t border-slate-900/10" aria-labelledby="symbol-label">
          <label className="block text-xs font-medium text-slate-700 mb-2">Symbol</label>
          <DropdownSelect
            options={symbolOptions}
            value={selectedSymbol}
            onChange={(value) => setSelectedSymbol(value as string)}
            placeholder="Search or select symbol"
            searchable
            searchPlaceholder="Type to search symbols..."
            categories={ASSET_CLASS_CATEGORIES}
            defaultCategory="crypto"
          />
        </section>

        <section className="py-3 border-t border-slate-900/10" aria-labelledby="autorefresh-label">
          <label className="block text-xs font-medium text-slate-700 mb-2">Auto Refresh</label>
          <AutoRefreshControl
            refreshInterval={autoRefresh.refreshInterval}
            onIntervalChange={autoRefresh.setRefreshInterval}
            lastRefreshedAt={autoRefresh.lastRefreshedAt}
            nextRefreshAt={autoRefresh.nextRefreshAt}
            isRefreshing={autoRefresh.isRefreshing}
          />
        </section>
      </div>
    </div>
  );
}
