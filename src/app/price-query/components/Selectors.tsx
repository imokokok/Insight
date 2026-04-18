'use client';

import { useMemo } from 'react';

import { Search, RefreshCw } from 'lucide-react';

import { SegmentedControl, DropdownSelect, type SelectorOption } from '@/components/ui';
import { getPriceOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { type OracleProvider, type Blockchain, BLOCKCHAIN_VALUES } from '@/types/oracle';

import { symbols, oracleColors, chainColors } from '../constants';
import { useQueryParams, useQueryData } from '../contexts';
import { useOracleSymbols } from '../hooks/useOracleSymbols';

import { AutoRefreshControl } from './AutoRefreshControl';

export function Selectors() {
  const {
    selectedOracle,
    setSelectedOracle,
    selectedChain,
    setSelectedChain,
    selectedSymbol,
    setSelectedSymbol,
  } = useQueryParams();

  const { isLoading, refetch, supportedChainsBySelectedOracles, autoRefresh } = useQueryData();

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
    if (!selectedOracle) {
      return symbols.slice(0, 12).map((symbol) => ({
        value: symbol,
        label: symbol,
      }));
    }

    if (selectedChain) {
      const symbolsForChain = getSymbolsForChain(selectedChain);
      return symbolsForChain.map((symbol) => ({
        value: symbol,
        label: symbol,
      }));
    }

    return supportedSymbols.map((symbol) => ({
      value: symbol,
      label: symbol,
    }));
  }, [selectedOracle, selectedChain, supportedSymbols, getSymbolsForChain]);

  const oracleOptions: SelectorOption<OracleProvider>[] =
    getPriceOracleProvidersSortedByMarketCap().map((oracle) => ({
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
      className="bg-white rounded-lg shadow-sm border border-gray-200"
      role="region"
      aria-label="Price query selectors"
    >
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" aria-hidden="true" />
          Price Query
        </h2>
        <button
          onClick={refetch}
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label={isLoading ? 'Loading...' : 'Query'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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
          <label className="block text-xs font-medium text-gray-700 mb-2">Oracle</label>
          <DropdownSelect
            options={oracleOptions}
            value={selectedOracle}
            onChange={(value) => {
              const newOracle = value as OracleProvider;
              setSelectedOracle(newOracle);
              setSelectedChain(null);
            }}
            placeholder="Select oracle"
          />
        </section>

        <section className="py-3 border-t border-gray-100" aria-labelledby="blockchain-label">
          <label className="block text-xs font-medium text-gray-700 mb-2">Blockchain</label>
          <DropdownSelect
            options={chainOptions}
            value={selectedChain}
            onChange={(value) => {
              const newChain = value as Blockchain;
              setSelectedChain(newChain);
              if (newChain && selectedSymbol && !isSymbolSupported(selectedSymbol, newChain)) {
                const symbolsForNewChain = getSymbolsForChain(newChain);
                if (symbolsForNewChain.length > 0) {
                  setSelectedSymbol(symbolsForNewChain[0]);
                }
              }
            }}
            placeholder="Select blockchain"
          />
        </section>

        <section className="py-3 border-t border-gray-100" aria-labelledby="symbol-label">
          <SegmentedControl
            options={symbolOptions}
            value={selectedSymbol}
            onChange={(value) => setSelectedSymbol(value as string)}
            label="Symbol"
            aria-label="Select symbol"
          />
        </section>

        <section className="py-3 border-t border-gray-100" aria-labelledby="autorefresh-label">
          <label className="block text-xs font-medium text-gray-700 mb-2">Auto Refresh</label>
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
