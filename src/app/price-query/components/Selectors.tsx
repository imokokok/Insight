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
      className="query-instrument editorial-panel border-y border-slate-900/15 bg-white/35"
      role="region"
      aria-label="Price query selectors"
    >
      <div className="query-instrument-header px-5 py-5">
        <span className="workbench-kicker">01 / Observation setup</span>
        <h2 className="mt-3 flex items-center gap-2.5 text-xl font-semibold tracking-tight text-white">
          <Search className="h-5 w-5 text-blue-300" aria-hidden="true" />
          Query parameters
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Select a source, network and asset to inspect its latest reported price.
        </p>
      </div>

      <div className="query-instrument-fields p-5">
        <section className="py-3 first:pt-0" aria-labelledby="oracle-label">
          <label id="oracle-label" className="block text-xs font-medium text-slate-700 mb-2">
            Oracle
          </label>
          <DropdownSelect
            ariaLabel="Oracle"
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
          <label id="blockchain-label" className="block text-xs font-medium text-slate-700 mb-2">
            Blockchain
            {!selectedOracle && (
              <span className="ml-1.5 text-[10px] text-amber-600 font-normal">
                (Select oracle first)
              </span>
            )}
          </label>
          <DropdownSelect
            ariaLabel="Blockchain"
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
          <label id="symbol-label" className="block text-xs font-medium text-slate-700 mb-2">
            Symbol
          </label>
          <DropdownSelect
            ariaLabel="Symbol"
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
          <label id="autorefresh-label" className="block text-xs font-medium text-slate-700 mb-2">
            Auto Refresh
          </label>
          <AutoRefreshControl
            refreshInterval={autoRefresh.refreshInterval}
            onIntervalChange={autoRefresh.setRefreshInterval}
            lastRefreshedAt={autoRefresh.lastRefreshedAt}
            nextRefreshAt={autoRefresh.nextRefreshAt}
            isRefreshing={autoRefresh.isRefreshing}
          />
        </section>
        <button
          type="button"
          onClick={refetch}
          disabled={isLoading}
          aria-busy={isLoading}
          className="query-submit mt-5 flex min-h-12 w-full items-center justify-center gap-2 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isLoading ? 'Reading oracle data…' : 'Run price query'}
        </button>
        <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
          Results retain the source, timestamp and freshness context.
        </p>
      </div>
    </div>
  );
}
