'use client';

import { useTranslations } from 'next-intl';
import { QueryHistoryItem } from '@/utils/queryHistory';
import { OracleProvider, Blockchain } from '@/lib/oracles';
import { History, Download, FileSpreadsheet, FileJson, Settings2 } from 'lucide-react';
import { useState } from 'react';

interface QueryHeaderProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  historyItems: QueryHistoryItem[];
  onSelectHistory: (item: QueryHistoryItem) => void;
  onClearHistory: () => void;
  loading: boolean;
  queryResultsLength: number;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onOpenExportConfig: () => void;
  selectedOracles: OracleProvider[];
  selectedChains: Blockchain[];
  selectedSymbol: string;
  selectedTimeRange: number;
  setSelectedOracles: (oracles: OracleProvider[]) => void;
  setSelectedChains: (chains: Blockchain[]) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeRange: (timeRange: number) => void;
}

export function QueryHeader({
  showHistory,
  setShowHistory,
  historyItems,
  onSelectHistory,
  onClearHistory,
  loading,
  queryResultsLength,
  onExportCSV,
  onExportJSON,
  onOpenExportConfig,
  selectedOracles,
  selectedChains,
  selectedSymbol,
  selectedTimeRange,
  setSelectedOracles,
  setSelectedChains,
  setSelectedSymbol,
  setSelectedTimeRange,
}: QueryHeaderProps) {
  const t = useTranslations();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleHistorySelect = (item: QueryHistoryItem) => {
    onSelectHistory(item);
    setShowHistory(false);
  };

  const handleClearHistory = () => {
    onClearHistory();
    setShowHistory(false);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t('navbar.priceQuery')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {loading
            ? t('priceQuery.loadingData')
            : queryResultsLength > 0
            ? t('priceQuery.results.count', { count: queryResultsLength })
            : t('priceQuery.subtitle')}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* History Button */}
        <div className="relative">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              showHistory
                ? 'bg-blue-50 text-blue-700'
                : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <History className="w-4 h-4" />
            {t('priceQuery.history.title')}
            {historyItems.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                {historyItems.length}
              </span>
            )}
          </button>

          {/* History Dropdown */}
          {showHistory && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {t('priceQuery.history.title')}
                </span>
                {historyItems.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    {t('clear')}
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {historyItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    {t('priceQuery.history.empty')}
                  </div>
                ) : (
                  historyItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleHistorySelect(item)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{item.symbol}</span>
                        <span className="text-xs text-gray-500">
                          {item.timeRange}h
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.oracles.length} {t('priceQuery.oracles')} · {item.chains.length} {t('priceQuery.chains')}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={loading || queryResultsLength === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white text-gray-600 rounded-lg hover:text-gray-900 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {t('export')}
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
              <button
                onClick={() => {
                  onExportCSV();
                  setShowExportMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                {t('priceQuery.export.csv')}
              </button>
              <button
                onClick={() => {
                  onExportJSON();
                  setShowExportMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <FileJson className="w-4 h-4 text-blue-600" />
                {t('priceQuery.export.json')}
              </button>
              <button
                onClick={() => {
                  onOpenExportConfig();
                  setShowExportMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 border-t border-gray-100"
              >
                <Settings2 className="w-4 h-4 text-purple-600" />
                {t('priceQuery.export.advanced')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showHistory || showExportMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowHistory(false);
            setShowExportMenu(false);
          }}
        />
      )}
    </div>
  );
}
