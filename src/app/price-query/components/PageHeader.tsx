'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/provider';
import { Icons } from './Icons';
import { QueryHistoryItem } from '@/utils/queryHistory';
import { formatHistoryTime } from '@/utils/queryHistory';
import { OracleProvider, Blockchain } from '@/types/oracle';
import { ArrowLeft, Heart, Download, RefreshCw } from 'lucide-react';

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
  onOpenExportConfig: () => void;
  selectedOracles: OracleProvider[];
  selectedChains: Blockchain[];
  selectedSymbol: string;
  selectedTimeRange: number;
  setSelectedOracles: (oracles: OracleProvider[]) => void;
  setSelectedChains: (chains: Blockchain[]) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeRange: (timeRange: number) => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  onExport?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  symbol?: string;
  chain?: string;
  provider?: string;
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
  onOpenExportConfig,
  onToggleFavorite,
  isFavorite,
  onExport,
  onRefresh,
  isRefreshing,
  symbol,
  chain,
  provider,
}: PageHeaderProps) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const handleHistorySelect = (item: QueryHistoryItem) => {
    onSelectHistory(item);
    setShowHistory(false);
  };

  const handleClearHistory = () => {
    onClearHistory();
    setShowHistory(false);
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/price-query')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{symbol || 'Price Query'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">{chain || '-'}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">{provider || '-'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className={`flex items-center gap-2 px-4 py-2 font-medium border transition-colors ${
              isFavorite
                ? 'bg-red-50 border-red-200 text-red-600 hover:border-red-300'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            {isFavorite
              ? locale === 'zh-CN'
                ? '已收藏'
                : 'Favorited'
              : locale === 'zh-CN'
                ? '收藏'
                : 'Favorite'}
          </button>
        )}

        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            {locale === 'zh-CN' ? '导出' : 'Export'}
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {locale === 'zh-CN' ? '刷新' : 'Refresh'}
          </button>
        )}
      </div>
    </div>
  );
}
