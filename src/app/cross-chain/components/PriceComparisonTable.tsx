'use client';

import { DataTablePro, type ColumnDef, type ConditionalFormattingRule } from '@/components/ui';
import { type CrossChainComparisonResult } from '@/lib/oracles/crossChainComparison';
import { isBlockchain } from '@/lib/utils/chainUtils';
import { formatPrice, formatPriceDiff } from '@/lib/utils/format';
import { useCrossChainConfigStore } from '@/stores/crossChainConfigStore';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';
import { useCrossChainUIStore } from '@/stores/crossChainUIStore';
import { type Blockchain } from '@/types/oracle';

import { useChartData } from '../hooks/useChartData';
import { useCrossChainTable } from '../hooks/useCrossChainTable';
import { useStatistics } from '../hooks/useStatistics';
import { useCurrentClient, useFilteredChains } from '../useCrossChainData';
import { chainNames, chainColors, calculateZScore, isOutlier } from '../utils';

interface TableRow extends Record<string, unknown> {
  chain: Blockchain;
  price: number;
  diff: number;
  diffPercent: number;
  isOutlier: boolean;
  zScore: number | null;
  priceHistory: number[];
  dataFreshness: number | null;
  chainStatus: 'online' | 'degraded' | 'offline' | null;
  deviationFromMedian: number | null;
}

export function PriceComparisonTable() {
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const selectedTimeRange = useCrossChainSelectorStore((s) => s.selectedTimeRange);
  const showMA = useCrossChainUIStore((s) => s.showMA);
  const maPeriod = useCrossChainUIStore((s) => s.maPeriod);
  const tableFilter = useCrossChainUIStore((s) => s.tableFilter);
  const setTableFilter = useCrossChainUIStore((s) => s.setTableFilter);

  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const historicalPrices = useCrossChainDataStore((s) => s.historicalPrices);
  const crossChainComparison = useCrossChainDataStore((s) => s.crossChainComparison);
  const thresholdConfig = useCrossChainConfigStore((s) => s.thresholdConfig);

  const filteredChains = useFilteredChains();
  const currentClient = useCurrentClient();

  const statistics = useStatistics({
    currentPrices,
    historicalPrices,
    filteredChains,
    selectedTimeRange,
    currentClient,
    selectedBaseChain,
  });

  const chart = useChartData({
    currentPrices,
    historicalPrices,
    filteredChains,
    selectedBaseChain,
    selectedTimeRange,
    showMA,
    maPeriod,
    validPrices: statistics.validPrices,
    avgPrice: statistics.avgPrice,
    standardDeviation: statistics.standardDeviation,
    medianPrice: statistics.medianPrice,
    thresholdConfig,
  });

  const table = useCrossChainTable({
    priceDifferences: chart.priceDifferences,
    historicalPrices,
    filteredChains,
    selectedBaseChain,
    thresholdConfig,
  });

  const { avgPrice, standardDeviation } = statistics;
  const { sortedPriceDifferences } = table;

  const comparisonMap = new Map<string, CrossChainComparisonResult>();
  for (const result of crossChainComparison) {
    comparisonMap.set(result.chain, result);
  }

  const tableData: TableRow[] = sortedPriceDifferences.map((item) => {
    const zScore = calculateZScore(item.price, avgPrice, standardDeviation);
    const chainHistoricalPrices = isBlockchain(item.chain)
      ? historicalPrices[item.chain]
      : undefined;
    const priceHistory = chainHistoricalPrices?.map((p) => p.price) ?? [];
    const comparison = comparisonMap.get(item.chain);

    return {
      chain: item.chain,
      price: item.price,
      diff: item.diff,
      diffPercent: item.diffPercent,
      isOutlier: isOutlier(zScore),
      zScore,
      priceHistory,
      dataFreshness: comparison?.latency ?? null,
      chainStatus: comparison?.status ?? null,
      deviationFromMedian: comparison?.deviation ?? null,
    };
  });

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

  const columns: ColumnDef<TableRow>[] = [
    {
      key: 'chain',
      header: 'Blockchain',
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
                Outlier
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'price',
      header: 'Price',
      width: 130,
      minWidth: 110,
      fixed: 'left',
      align: 'right',
      sortable: true,
      formatter: (value: unknown) => {
        const price = value as number;
        return <span className="font-mono text-sm text-gray-900">{formatPrice(price)}</span>;
      },
    },
    {
      key: 'diff',
      header: `Difference vs ${selectedBaseChain ? chainNames[selectedBaseChain] : '-'}`,
      width: 130,
      minWidth: 110,
      align: 'right',
      sortable: true,
      formatter: (value: unknown, row: TableRow) => {
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
            {formatPriceDiff(diff, row.price)}
          </span>
        );
      },
    },
    {
      key: 'diffPercent',
      header: '% Difference',
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
      header: 'Z-Score',
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
      key: 'dataFreshness',
      header: 'Data Age',
      width: 110,
      minWidth: 90,
      align: 'right',
      sortable: true,
      formatter: (value: unknown) => {
        const age = value as number | null;
        if (age === null || age === Infinity) return <span className="text-gray-400">-</span>;

        let formatted: string;
        let colorClass: string;

        if (age < 60) {
          formatted = `${age.toFixed(0)}s`;
          colorClass = 'text-emerald-600';
        } else if (age < 300) {
          formatted = `${(age / 60).toFixed(1)}m`;
          colorClass = 'text-amber-600';
        } else {
          formatted = `${(age / 3600).toFixed(1)}h`;
          colorClass = 'text-red-600';
        }

        return <span className={`font-mono text-sm ${colorClass}`}>{formatted}</span>;
      },
    },
    {
      key: 'chainStatus',
      header: 'Status',
      width: 90,
      minWidth: 70,
      align: 'center',
      sortable: true,
      formatter: (value: unknown) => {
        const status = value as 'online' | 'degraded' | 'offline' | null;
        if (!status) return <span className="text-gray-400">-</span>;

        const config = {
          online: { label: 'Online', className: 'bg-emerald-100 text-emerald-700' },
          degraded: { label: 'Degraded', className: 'bg-amber-100 text-amber-700' },
          offline: { label: 'Offline', className: 'bg-red-100 text-red-700' },
        }[status];

        return (
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'trend',
      header: 'Trend',
      width: 80,
      minWidth: 60,
      align: 'center',
      sortable: false,
      formatter: (_value: unknown, row: TableRow) => {
        const prices = row.priceHistory;

        if (!prices || prices.length < 2) {
          return <span className="text-gray-300">-</span>;
        }

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

  const fixedColumns = {
    left: ['chain', 'price'],
  };

  return (
    <div className="mb-6 pb-6 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Price Comparison
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Filter:</span>
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
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
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
        emptyText="No data available"
      />
    </div>
  );
}
