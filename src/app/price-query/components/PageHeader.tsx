'use client';

import { useI18n } from '@/lib/i18n/provider';
import { Icons } from './Icons';
import { QueryHistoryItem } from '@/utils/queryHistory';
import { formatHistoryTime } from '@/utils/queryHistory';
import { OracleProvider, Blockchain } from '@/lib/types/oracle';

interface PageHeaderProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  historyItems: QueryHistoryItem[];
  onSelectHistory: (item: QueryHistoryItem) => void;
  onClearHistory: () => void;
  loading: boolean;
  queryResultsLength: number;
  onExportCSV: () => void;
  onExportJSON: () => void;
  selectedOracles: OracleProvider[];
  selectedChains: Blockchain[];
  selectedSymbol: string;
  selectedTimeRange: number;
  setSelectedOracles: (oracles: OracleProvider[]) => void;
  setSelectedChains: (chains: Blockchain[]) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeRange: (timeRange: number) => void;
}

export function PageHeader({
  showHistory,
  setShowHistory,
  historyItems,
  onSelectHistory,
  onClearHistory,
  loading,
  queryResultsLength,
  onExportCSV,
  onExportJSON,
}: PageHeaderProps) {
  const { t } = useI18n();

  const handleHistorySelect = (item: QueryHistoryItem) => {
    onSelectHistory(item);
    setShowHistory(false);
  };

  const handleClearHistory = () => {
    onClearHistory();
    setShowHistory(false);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-gray-200">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('priceQuery.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('priceQuery.description')}</p>
      </div>
      <div className="flex items-center gap-3 mt-4 md:mt-0">
        <div className="relative">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Icons.clock />
            历史记录
          </button>
          {showHistory && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowHistory(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 shadow-lg z-20">
                {historyItems.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">暂无历史记录</div>
                ) : (
                  <>
                    <div className="max-h-80 overflow-y-auto">
                      {historyItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleHistorySelect(item)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="text-sm font-medium text-gray-900">{item.symbol}</div>
                            <div className="text-xs text-gray-500">
                              {formatHistoryTime(item.timestamp)}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.oracles.length} 个预言机 · {item.chains.length} 条链
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleClearHistory}
                      className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-200 transition-colors"
                    >
                      清除历史记录
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <button
          onClick={onExportCSV}
          disabled={loading || queryResultsLength === 0}
          aria-label={t('priceQuery.export.csv')}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          <Icons.download />
          {t('priceQuery.export.csv')}
        </button>
        <button
          onClick={onExportJSON}
          disabled={loading || queryResultsLength === 0}
          aria-label={t('priceQuery.export.json')}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          <Icons.download />
          {t('priceQuery.export.json')}
        </button>
      </div>
    </div>
  );
}
