'use client';

import { formatPrice } from '@/app/[locale]/price-query/utils/queryResultsUtils';
import { DataTablePro, type ColumnDef, type ConditionalFormattingRule } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { type Blockchain } from '@/lib/oracles';
import { isBlockchain } from '@/lib/utils/chainUtils';

import { type useCrossChainData } from '../useCrossChainData';
import { chainNames, chainColors, calculateZScore, isOutlier } from '../utils';

interface PriceComparisonTableProps {
  data: ReturnType<typeof useCrossChainData>;
}

interface TableRow extends Record<string, unknown> {
  chain: Blockchain;
  price: number;
  diff: number;
  diffPercent: number;
  isOutlier: boolean;
  zScore: number | null;
  priceHistory: number[];
}

export function PriceComparisonTable({ data }: PriceComparisonTableProps) {
  const t = useTranslations();
  const {
    sortedPriceDifferences,
    selectedBaseChain,
    historicalPrices,
    avgPrice,
    standardDeviation,
    tableFilter,
    setTableFilter,
  } = data;

  // Transform data for DataTablePro
  const tableData: TableRow[] = sortedPriceDifferences.map((item) => {
    const zScore = calculateZScore(item.price, avgPrice, standardDeviation);
    const chainHistoricalPrices = isBlockchain(item.chain)
      ? historicalPrices[item.chain]
      : undefined;
    const priceHistory = chainHistoricalPrices?.map((p) => p.price) ?? [];

    return {
      chain: item.chain,
      price: item.price,
      diff: item.diff,
      diffPercent: item.diffPercent,
      isOutlier: isOutlier(zScore),
      zScore,
      priceHistory,
    };
  });

  // Conditional formatting rules for price differences
  const conditionalFormatting = [
    {
      field: 'diffPercent',
      rules: [
        {
          condition: 'gt' as const,
          value: 0.5,
          style: 'danger' as const,
        },
        {
          condition: 'lt' as const,
          value: -0.5,
          style: 'success' as const,
        },
      ] as ConditionalFormattingRule[],
    },
  ];

  // Define columns using ColumnDef interface
  const columns: ColumnDef<TableRow>[] = [
    {
      key: 'chain',
      header: t('crossChain.blockchain'),
      width: 160,
      minWidth: 140,
      fixed: 'left',
      sortable: true,
      formatter: (_value: unknown, row: TableRow) => {
        const chain = row.chain;
        const chainName = chainNames[chain];
        const color = chainColors[chain];

        return (
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-medium text-gray-900 truncate">{chainName}</span>
            {row.isOutlier && (
              <span className="flex-shrink-0 text-amber-700 text-xs font-medium bg-amber-100 px-1.5 py-0.5 rounded">
                {t('crossChain.outlier')}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'price',
      header: t('crossChain.price'),
      width: 130,
      minWidth: 110,
      fixed: 'left',
      align: 'right',
      sortable: true,
      formatter: (value: unknown) => {
        const price = value as number;
        return <span className="font-mono text-sm text-gray-900">${formatPrice(price)}</span>;
      },
    },
    {
      key: 'diff',
      header: t('crossChain.differenceVs', {
        chain: selectedBaseChain ? chainNames[selectedBaseChain] : '-',
      }),
      width: 130,
      minWidth: 110,
      align: 'right',
      sortable: true,
      formatter: (value: unknown, _row: TableRow) => {
        const diff = value as number;
        const isPositive = diff >= 0;
        const isSignificant = Math.abs(diff) > 0.5;

        return (
          <span
            className={`font-mono text-sm ${
              isSignificant
                ? isPositive
                  ? 'text-red-600 font-semibold'
                  : 'text-emerald-600 font-semibold'
                : isPositive
                  ? 'text-red-600'
                  : 'text-emerald-600'
            }`}
          >
            {isPositive ? '+' : ''}${diff.toFixed(4)}
          </span>
        );
      },
    },
    {
      key: 'diffPercent',
      header: t('crossChain.percentDifference'),
      width: 130,
      minWidth: 110,
      align: 'right',
      sortable: true,
      formatter: (value: unknown, _row: TableRow) => {
        const diffPercent = value as number;
        const isSignificant = Math.abs(diffPercent) > 0.5;

        return (
          <span
            className={`font-mono text-sm ${
              isSignificant ? 'font-semibold' : ''
            } ${diffPercent > 0 ? 'text-red-600' : 'text-emerald-600'}`}
          >
            {diffPercent >= 0 ? '+' : ''}
            {diffPercent.toFixed(4)}%
          </span>
        );
      },
      conditionalFormat: {
        rules: [
          {
            condition: 'gt',
            value: 0.5,
            style: 'danger',
          },
          {
            condition: 'lt',
            value: -0.5,
            style: 'success',
          },
        ],
      },
    },
    {
      key: 'zScore',
      header: t('crossChain.zScore'),
      width: 100,
      minWidth: 80,
      align: 'right',
      sortable: true,
      formatter: (value: unknown, _row: TableRow) => {
        const zScore = value as number | null;
        if (zScore === null) return <span className="text-gray-400">-</span>;

        const isSignificant = Math.abs(zScore) > 2;
        return (
          <span
            className={`font-mono text-sm ${
              isSignificant ? 'text-amber-600 font-semibold' : 'text-gray-600'
            }`}
          >
            {zScore.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: 'trend',
      header: t('crossChain.trend'),
      width: 80,
      minWidth: 60,
      align: 'center',
      sortable: false,
      formatter: (_value: unknown, row: TableRow) => {
        const prices = row.priceHistory;

        if (!prices || prices.length < 2) {
          return <span className="text-gray-300">-</span>;
        }

        // 简单的趋势指示
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const trend = lastPrice > firstPrice ? 'up' : lastPrice < firstPrice ? 'down' : 'neutral';

        return (
          <div className="flex items-center justify-center">
            <span
              className={`text-lg ${
                trend === 'up'
                  ? 'text-emerald-500'
                  : trend === 'down'
                    ? 'text-red-500'
                    : 'text-gray-400'
              }`}
            >
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
            </span>
          </div>
        );
      },
    },
  ];

  // Fixed columns configuration
  const fixedColumns = {
    left: ['chain', 'price'],
  };

  return (
    <div className="mb-6 pb-6 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          {t('crossChain.priceComparisonTable')}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">{t('crossChain.filter')}:</span>
          {(['all', 'abnormal', 'normal'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTableFilter(filter)}
              className={`px-3 py-1 text-xs font-medium transition-all duration-200 rounded-md ${
                tableFilter === filter
                  ? filter === 'abnormal'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : filter === 'normal'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
              }`}
            >
              {t(`crossChain.filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      <DataTablePro<TableRow>
        data={tableData}
        columns={columns}
        fixedColumns={fixedColumns}
        conditionalFormatting={conditionalFormatting}
        density="normal"
        maxHeight={400}
        emptyText={t('crossChain.noData')}
      />
    </div>
  );
}

export default PriceComparisonTable;
