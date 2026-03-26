'use client';

/**
 * @fileoverview 价格查询页面头部组件
 * @description 包含页面标题、收藏夹、历史记录和导出功能
 */

import { useTranslations } from '@/i18n';
import { useState } from 'react';
import { History } from 'lucide-react';
import { Download } from 'lucide-react';
import { FileSpreadsheet } from 'lucide-react';
import { FileJson } from 'lucide-react';
import { Settings2 } from 'lucide-react';
import { QueryHistoryItem } from '@/utils/queryHistory';
import { OracleProvider, Blockchain } from '@/lib/oracles';
import { FavoriteButton } from '@/components/favorites';
import { FavoriteConfig } from '@/hooks';
import { useUser } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

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
  // Favorites
  symbolFavorites: { id?: string; name: string; config_data: Record<string, unknown> }[];
  currentFavoriteConfig: FavoriteConfig;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: (show: boolean) => void;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleApplyFavorite: (config: FavoriteConfig) => void;
}

/**
 * 价格查询页面头部组件
 *
 * @param props - 组件属性
 * @returns 页面头部 JSX 元素
 */
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
  symbolFavorites,
  currentFavoriteConfig,
  showFavoritesDropdown,
  setShowFavoritesDropdown,
  favoritesDropdownRef,
  handleApplyFavorite,
}: QueryHeaderProps) {
  const t = useTranslations();
  const router = useRouter();
  const user = useUser();
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
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      {/* 标题区域 */}
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

      {/* 操作按钮区域 */}
      <nav className="flex items-center gap-2" aria-label="页面操作">
        {/* 收藏夹按钮 */}
        {user && (
          <FavoriteButton
            configType="symbol"
            configData={currentFavoriteConfig}
            name={`${selectedSymbol} - ${selectedOracles.length} oracles, ${selectedChains.length} chains`}
            variant="button"
            showLabel
          />
        )}

        {/* 收藏夹下拉菜单 */}
        {user && symbolFavorites && symbolFavorites.length > 0 && (
          <div className="relative" ref={favoritesDropdownRef}>
            <button
              onClick={() => setShowFavoritesDropdown(!showFavoritesDropdown)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-all border border-gray-200 shadow-sm"
              aria-expanded={showFavoritesDropdown}
              aria-haspopup="listbox"
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <span>{t('crossOracle.favorites.button')}</span>
              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                {symbolFavorites.length}
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${showFavoritesDropdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showFavoritesDropdown && (
              <div
                className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto"
                role="listbox"
              >
                <div className="p-2 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t('crossOracle.favorites.quickAccess')}
                  </h3>
                </div>
                <div className="p-1">
                  {symbolFavorites.map((favorite) => {
                    const config = favorite.config_data as FavoriteConfig;
                    return (
                      <button
                        key={favorite.id}
                        onClick={() => handleApplyFavorite(config)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors rounded-md"
                        role="option"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {favorite.name}
                          </span>
                          <span className="text-xs text-gray-500">{config.symbol}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {config.selectedOracles?.slice(0, 2).map((oracle) => (
                            <span
                              key={oracle}
                              className="px-1.5 py-0.5 text-xs bg-primary-50 text-primary-700 border border-primary-100 rounded"
                            >
                              {oracle}
                            </span>
                          ))}
                          {(config.selectedOracles?.length || 0) > 2 && (
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded">
                              +{(config.selectedOracles?.length || 0) - 2}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="p-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setShowFavoritesDropdown(false);
                      router.push('/favorites');
                    }}
                    className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {t('crossOracle.favorites.viewAll')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 历史记录按钮 */}
        <div className="relative">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all border shadow-sm ${
              showHistory
                ? 'bg-primary-50 text-primary-700 border-primary-200'
                : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-200'
            }`}
            aria-expanded={showHistory}
            aria-haspopup="listbox"
          >
            <History className="w-4 h-4" aria-hidden="true" />
            {t('priceQuery.history.title')}
            {historyItems.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                {historyItems.length}
              </span>
            )}
          </button>

          {/* 历史记录下拉菜单 */}
          {showHistory && (
            <div
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
              role="listbox"
            >
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {t('priceQuery.history.title')}
                </span>
                {historyItems.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-danger-600 hover:text-danger-700 font-medium"
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
                      role="option"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{item.symbol}</span>
                        <span className="text-xs text-gray-500">{item.timeRange}h</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.oracles.length} {t('priceQuery.oracles')} · {item.chains.length}{' '}
                        {t('priceQuery.chains')}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 导出下拉菜单 */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={loading || queryResultsLength === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 shadow-sm"
            aria-expanded={showExportMenu}
            aria-haspopup="listbox"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            {t('export.export')}
          </button>

          {showExportMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
              role="listbox"
            >
              <button
                onClick={() => {
                  onExportCSV();
                  setShowExportMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                role="option"
              >
                <FileSpreadsheet className="w-4 h-4 text-success-600" aria-hidden="true" />
                {t('priceQuery.export.csv')}
              </button>
              <button
                onClick={() => {
                  onExportJSON();
                  setShowExportMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                role="option"
              >
                <FileJson className="w-4 h-4 text-primary-600" aria-hidden="true" />
                {t('priceQuery.export.json')}
              </button>
              <button
                onClick={() => {
                  onOpenExportConfig();
                  setShowExportMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 border-t border-gray-100"
                role="option"
              >
                <Settings2 className="w-4 h-4 text-purple-600" aria-hidden="true" />
                {t('priceQuery.export.advanced')}
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* 点击外部关闭下拉菜单 */}
      {(showHistory || showExportMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowHistory(false);
            setShowExportMenu(false);
          }}
          aria-hidden="true"
        />
      )}
    </header>
  );
}
