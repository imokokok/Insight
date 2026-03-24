'use client';

import { useTranslations } from 'next-intl';
import { Blockchain } from '@/lib/oracles';
import { DataTablePro, ColumnDef, ConditionalFormattingRule } from '@/components/ui/DataTablePro';
import { useCrossChainData } from '../useCrossChainData';
import { chainNames, chainColors, getDiffTextColor, calculateZScore, isOutlier } from '../utils';
import { Sparkline } from './SmallComponents';

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
    const chainHistoricalPrices = historicalPrices[item.chain as Blockchain];
    const priceHistory = chainHistoricalPrices?.map((p) => p.price) || [];

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

  // Conditional formatting rules for price differences > 0.5%
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
      width: 180,
      minWidth: 150,
      fixed: 'left',
      sortable: true,
      formatter: (_value: unknown, row: TableRow) => {
        const chain = row.chain;
        const chainName = chainNames[chain];
        const color = chainColors[chain];

        return (
          <div className="flex items-center">
            <div className="w-3 h-3 mr-2 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium text-gray-900">{chainName}</span>
            {row.isOutlier && (
              <span className="ml-2 text-amber-600 text-xs font-medium bg-amber-100 px-1.5 py-0.5 rounded">
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
      width: 140,
      minWidth: 120,
      fixed: 'left',
      align: 'right',
      sortable: true,
      formatter: (value: unknown) => {
        const price = value as number;
        return (
          <span className="font-mono text-sm text-gray-900">
            $
            {price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}
          </span>
        );
      },
    },
    {
      key: 'diff',
      header: t('crossChain.differenceVs', {
        chain: selectedBaseChain ? chainNames[selectedBaseChain] : '-',
      }),
      width: 140,
      minWidth: 120,
      align: 'right',
      sortable: true,
      formatter: (value: unknown) => {
        const diff = value as number;
        const isPositive = diff >= 0;
        return (
          <span
            className={`font-mono text-sm ${isPositive ? 'text-success-600' : 'text-danger-600'}`}
          >
            {isPositive ? '+' : ''}${diff.toFixed(4)}
          </span>
        );
      },
    },
    {
      key: 'diffPercent',
      header: t('crossChain.percentDifference'),
      width: 140,
      minWidth: 120,
      align: 'right',
      sortable: true,
      formatter: (value: unknown) => {
        const diffPercent = value as number;
        const textColor = getDiffTextColor(diffPercent);
        return (
          <span className={`font-mono text-sm font-medium ${textColor}`}>
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
      key: 'trend',
      header: t('crossChain.trend'),
      width: 100,
      minWidth: 80,
      align: 'center',
      sortable: false,
      formatter: (_value: unknown, row: TableRow) => {
        const chain = row.chain;
        const color = chainColors[chain];
        return <Sparkline data={row.priceHistory} color={color} />;
      },
    },
  ];

  // Fixed columns configuration
  const fixedColumns = {
    left: ['chain', 'price'],
  };

  return (
    <div className="mb-8 pb-8 border-b border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
          {t('crossChain.priceComparisonTable')}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{t('crossChain.filter')}:</span>
          {(['all', 'abnormal', 'normal'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTableFilter(filter)}
              className={`px-3 py-1 text-xs font-medium transition-colors rounded-md ${
                tableFilter === filter
                  ? filter === 'abnormal'
                    ? 'bg-danger-100 text-danger-700 border border-danger-200'
                    : filter === 'normal'
                      ? 'bg-success-100 text-success-700 border border-green-200'
                      : 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'bg-gray-100 text-gray-600 hover:border-gray-300 border border-transparent'
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
        maxHeight={500}
        emptyText={t('crossChain.noData')}
      />
    </div>
  );
}

export default PriceComparisonTable;
