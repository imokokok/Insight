'use client';

import React, { memo, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { TrendingUp, TrendingDown, Search, X, ChevronDown } from 'lucide-react';

import { DataTablePro, type ColumnDef, type ConditionalFormattingConfig } from '@/components/ui';
import { Tooltip } from '@/components/ui/Tooltip';
import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import { formatCompactNumber } from '@/lib/utils/format';

import { type MarketFilterState } from '../hooks/useMarketFilter';
import { type AssetData } from '../types';

import EmptyState from './EmptyState';
import { AssetsTableSkeleton } from './skeletons';

interface AssetsTableProps {
  assets: AssetData[];
  filters?: MarketFilterState;
  onSearchChange?: (value: string) => void;
  onOracleFilterChange?: (value: string | null) => void;
  onChangeMagnitudeChange?: (value: 'all' | 'high' | 'medium' | 'low') => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  totalAssetsCount?: number;
  loading?: boolean;
}

// 预言机品牌色映射
const oracleBrandColors: Record<string, string> = {
  chainlink: chartColors.oracle.chainlink,
  'band-protocol': chartColors.oracle['band-protocol'],
  uma: chartColors.oracle.uma,
  pyth: chartColors.oracle.pyth,
  api3: chartColors.oracle.api3,
  redstone: chartColors.oracle.redstone,
  dia: chartColors.oracle.dia,
  winklink: chartColors.oracle.winklink,
};

// 获取预言机品牌色
function getOracleBrandColor(oracleName: string): string {
  const normalizedName = oracleName.toLowerCase().replace(/\s+/g, '-');
  return oracleBrandColors[normalizedName] || chartColors.sequence[0];
}

// 获取预言机详情页路由
function getOracleRoute(oracleName: string): string {
  const normalizedName = oracleName.toLowerCase().replace(/\s+/g, '-');
  const routeMap: Record<string, string> = {
    chainlink: '/chainlink',
    'band-protocol': '/band-protocol',
    uma: '/uma',
    pyth: '/pyth',
    api3: '/api3',
    redstone: '/redstone',
    dia: '/dia',
    winklink: '/winklink',
  };
  return routeMap[normalizedName] || '#';
}

// 排名徽章样式配置
const rankBadgeStyles: Record<number, { bg: string; text: string }> = {
  1: { bg: '#FFD700', text: '#1f2937' }, // 金色
  2: { bg: '#C0C0C0', text: '#1f2937' }, // 银色
  3: { bg: '#CD7F32', text: '#ffffff' }, // 铜色
};

// 获取排名徽章样式
function getRankBadgeStyle(rank: number): { bg: string; text: string } {
  return rankBadgeStyles[rank] || { bg: '#f3f4f6', text: '#6b7280' }; // 灰色默认
}

// Custom comparison function for AssetsTable props
function arePropsEqual(prevProps: AssetsTableProps, nextProps: AssetsTableProps): boolean {
  if (prevProps.loading !== nextProps.loading) return false;

  // Compare arrays by length
  if (prevProps.assets.length !== nextProps.assets.length) return false;

  // Compare each asset by reference (shallow comparison)
  for (let i = 0; i < prevProps.assets.length; i++) {
    if (prevProps.assets[i] !== nextProps.assets[i]) {
      return false;
    }
  }

  return true;
}

function AssetsTableComponent({
  assets,
  filters,
  onSearchChange,
  onOracleFilterChange,
  onChangeMagnitudeChange,
  onClearFilters,
  hasActiveFilters = false,
  totalAssetsCount,
  loading = false,
}: AssetsTableProps) {
  const t = useTranslations('marketOverview');
  const router = useRouter();
  const [showOracleDropdown, setShowOracleDropdown] = useState(false);

  const uniqueOracles = useMemo(() => {
    const oracles = new Set(assets.map((a) => a.primaryOracle));
    return Array.from(oracles).sort();
  }, [assets]);

  if (loading) {
    return <AssetsTableSkeleton rows={8} />;
  }

  if (!assets || assets.length === 0) {
    return <EmptyState type="table" compact />;
  }

  const tableData = assets.map((asset) => ({ ...asset }) as Record<string, unknown>);

  const columns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: 'symbol',
      header: t('asset'),
      width: 160,
      sortable: true,
      formatter: (_value: unknown, row: Record<string, unknown>) => {
        const assetRow = row as unknown as AssetData;
        const index = assets.findIndex((a) => a.symbol === assetRow.symbol);
        const rank = index + 1;
        const badgeStyle = getRankBadgeStyle(rank);
        return (
          <div className="flex items-center gap-3">
            <span
              className="w-5 h-5 flex items-center justify-center text-xs font-semibold rounded"
              style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text }}
            >
              {rank}
            </span>
            <div>
              <span className="font-semibold text-gray-900 block text-sm">{assetRow.symbol}</span>
              <span className="text-xs text-gray-400">
                ${formatCompactNumber(assetRow.marketCap)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'price',
      header: t('price'),
      width: 120,
      sortable: true,
      formatter: (_value: unknown, row: Record<string, unknown>) => {
        const assetRow = row as unknown as AssetData;
        return <span className="font-semibold text-gray-900">{formatPrice(assetRow.price)}</span>;
      },
    },
    {
      key: 'change24h',
      header: t('change24h'),
      width: 110,
      sortable: true,
      formatter: (value: unknown) => {
        const change = value as number;
        const isPositive = change >= 0;
        const textColor = isPositive ? 'text-emerald-600' : 'text-red-600';
        const Icon = isPositive ? TrendingUp : TrendingDown;

        return (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${textColor}`}>
            <Icon className="w-3 h-3" />
            {isPositive ? '+' : ''}
            {change.toFixed(2)}%
          </span>
        );
      },
    },
    {
      key: 'change7d',
      header: t('change7d'),
      width: 110,
      sortable: true,
      formatter: (value: unknown) => {
        const change = value as number;
        const isPositive = change >= 0;
        const textColor = isPositive ? 'text-emerald-600' : 'text-red-600';
        const Icon = isPositive ? TrendingUp : TrendingDown;

        return (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${textColor}`}>
            <Icon className="w-3 h-3" />
            {isPositive ? '+' : ''}
            {change.toFixed(2)}%
          </span>
        );
      },
    },
    {
      key: 'volume24h',
      header: t('volume24h'),
      width: 120,
      sortable: true,
      formatter: (value: unknown) => (
        <span className="text-gray-500 text-xs font-medium">
          ${formatCompactNumber(value as number)}
        </span>
      ),
    },
    {
      key: 'primaryOracle',
      header: t('primaryOracle'),
      width: 140,
      sortable: true,
      formatter: (value: unknown) => {
        const oracleName = value as string;
        const brandColor = getOracleBrandColor(oracleName);
        const route = getOracleRoute(oracleName);

        return (
          <Tooltip content={t('viewOracleDetails', { oracle: oracleName })} placement="top">
            <button
              onClick={() => router.push(route)}
              className="inline-flex items-center gap-2 cursor-pointer group"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: brandColor }} />
              <span className="text-xs font-medium text-primary-600 group-hover:underline">
                {oracleName}
              </span>
            </button>
          </Tooltip>
        );
      },
    },
  ];

  const conditionalFormatting: ConditionalFormattingConfig[] = [
    {
      field: 'change24h',
      rules: [
        {
          condition: 'gt',
          value: 0,
          style: 'success',
        },
        {
          condition: 'lt',
          value: 0,
          style: 'danger',
        },
      ],
    },
    {
      field: 'change7d',
      rules: [
        {
          condition: 'gt',
          value: 0,
          style: 'success',
        },
        {
          condition: 'lt',
          value: 0,
          style: 'danger',
        },
      ],
    },
  ];

  return (
    <div className="overflow-hidden">
      <div className="pb-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">{t('topAssets')}</h3>
        </div>
        <span className="text-xs text-gray-400">
          {assets.length} {t('assetsCount')}
          {totalAssetsCount && totalAssetsCount !== assets.length && (
            <span className="text-gray-500 ml-1">
              ({t('filter.filteredFrom')} {totalAssetsCount})
            </span>
          )}
        </span>
      </div>

      {onSearchChange && (
        <div className="py-3 border-b border-gray-100 space-y-2">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters?.searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t('filter.searchPlaceholder')}
                className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              />
              {filters?.searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {onOracleFilterChange && (
              <div className="relative">
                <button
                  onClick={() => setShowOracleDropdown(!showOracleDropdown)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded transition-colors ${
                    filters?.oracleFilter
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span>{filters?.oracleFilter || t('filter.allOracles')}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showOracleDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[120px] max-h-48 overflow-y-auto">
                    <button
                      onClick={() => {
                        onOracleFilterChange(null);
                        setShowOracleDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                        !filters?.oracleFilter ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      }`}
                    >
                      {t('filter.all')}
                    </button>
                    {uniqueOracles.map((oracle) => (
                      <button
                        key={oracle}
                        onClick={() => {
                          onOracleFilterChange(oracle);
                          setShowOracleDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                          filters?.oracleFilter === oracle
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700'
                        }`}
                      >
                        {oracle}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {onChangeMagnitudeChange && (
              <select
                value={filters?.changeMagnitude || 'all'}
                onChange={(e) =>
                  onChangeMagnitudeChange(e.target.value as 'all' | 'high' | 'medium' | 'low')
                }
                className={`px-2.5 py-1.5 text-xs border rounded focus:outline-none focus:border-primary-400 ${
                  filters?.changeMagnitude && filters.changeMagnitude !== 'all'
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <option value="all">{t('filter.allChanges')}</option>
                <option value="high">{t('filter.highChange')}</option>
                <option value="medium">{t('filter.mediumChange')}</option>
                <option value="low">{t('filter.lowChange')}</option>
              </select>
            )}

            {hasActiveFilters && onClearFilters && (
              <button
                onClick={onClearFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                {t('filter.clear')}
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium">{t('filter.activeFilters')}:</span>
              {filters?.searchQuery && (
                <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                  {t('filter.search')}: &quot;{filters.searchQuery}&quot;
                </span>
              )}
              {filters?.oracleFilter && (
                <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                  {t('oracle')}: {filters.oracleFilter}
                </span>
              )}
              {filters?.changeMagnitude && filters.changeMagnitude !== 'all' && (
                <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                  {t('filter.change')}: {t(`filter.${filters.changeMagnitude}Change`)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <DataTablePro<Record<string, unknown>>
        data={tableData}
        columns={columns}
        fixedColumns={{ left: ['symbol', 'price'] }}
        conditionalFormatting={conditionalFormatting}
        multiSort
        density="compact"
        virtualScroll
        rowHeight={44}
        maxHeight={600}
        scrollPositionKey="market-overview-assets-table"
        className="mt-3"
      />
    </div>
  );
}

// Export memoized component
const AssetsTable = memo(AssetsTableComponent, arePropsEqual);
export default AssetsTable;
