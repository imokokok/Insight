'use client';

import React, { memo, useMemo } from 'react';
import { useTranslations } from '@/i18n';
import { TrendingUp } from 'lucide-react';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import { formatCompactNumber } from '@/lib/utils/format';
import { DataTablePro, ColumnDef, ConditionalFormattingConfig } from '@/components/ui';
import { AssetData } from '../types';

interface AssetsTableProps {
  assets: AssetData[];
}

// Custom comparison function for AssetsTable props
function arePropsEqual(prevProps: AssetsTableProps, nextProps: AssetsTableProps): boolean {
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

function AssetsTableComponent({ assets }: AssetsTableProps) {
  const t = useTranslations('marketOverview');

  // Convert AssetData to Record<string, unknown> compatible format
  const tableData = useMemo(() =>
    assets.map(asset => ({ ...asset } as Record<string, unknown>)),
    [assets]
  );

  const columns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: 'symbol',
      header: t('asset'),
      width: 160,
      sortable: true,
      formatter: (_value: unknown, row: Record<string, unknown>) => {
        const assetRow = row as unknown as AssetData;
        const index = assets.findIndex((a) => a.symbol === assetRow.symbol);
        return (
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 flex items-center justify-center text-xs font-medium text-gray-400 bg-gray-100">
              {index + 1}
            </span>
            <div>
              <span className="font-semibold text-gray-900 block text-sm">
                {assetRow.symbol}
              </span>
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
        return (
          <span className="font-semibold text-gray-900">
            {formatPrice(assetRow.price)}
          </span>
        );
      },
    },
    {
      key: 'change24h',
      header: t('change24h'),
      width: 100,
      sortable: true,
      formatter: (value: unknown) => {
        const change = value as number;
        const sign = change >= 0 ? '+' : '';
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium">
            {sign}{change.toFixed(2)}%
          </span>
        );
      },
    },
    {
      key: 'change7d',
      header: t('change7d'),
      width: 100,
      sortable: true,
      formatter: (value: unknown) => {
        const change = value as number;
        const sign = change >= 0 ? '+' : '';
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium">
            {sign}{change.toFixed(2)}%
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
      width: 120,
      sortable: true,
      formatter: (value: unknown) => (
        <span className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-200 cursor-pointer">
          {value as string}
        </span>
      ),
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
          <h3 className="text-sm font-semibold text-gray-900">
            {t('topAssets')}
          </h3>
        </div>
        <span className="text-xs text-gray-400">
          {assets.length} {t('assetsCount')}
        </span>
      </div>
      <DataTablePro<Record<string, unknown>>
        data={tableData}
        columns={columns}
        fixedColumns={{ left: ['symbol', 'price'] }}
        conditionalFormatting={conditionalFormatting}
        multiSort
        density="compact"
        className="mt-3"
      />
    </div>
  );
}

// Export memoized component
const AssetsTable = memo(AssetsTableComponent, arePropsEqual);
export default AssetsTable;
