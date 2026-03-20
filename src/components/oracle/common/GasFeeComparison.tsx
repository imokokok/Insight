'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  chainColors,
  chartColors,
  semanticColors,
  baseColors,
  animationColors,
} from '@/lib/config/colors';
import { DashboardCard } from './DashboardCard';
import { useTranslations } from 'next-intl';

export interface GasFeeData {
  chain: string;
  chainId: number;
  updateFee: number; // USD
  verificationFee: number; // USD
  currency: string;
}

interface GasFeeComparisonProps {
  data: GasFeeData[];
  loading?: boolean;
}

const CHAIN_COLOR_MAP: Record<string, string> = {
  Ethereum: chainColors.ethereum,
  'Arbitrum One': chainColors.arbitrum,
  Optimism: chainColors.optimism,
  Base: chainColors.base,
  Polygon: chainColors.polygon,
  Avalanche: chainColors.avalanche,
  BSC: chainColors.bnbChain,
  Fantom: chainColors.fantom,
  Metis: baseColors.gray[400],
  Moonbeam: baseColors.gray[400],
  Moonriver: baseColors.gray[400],
  Gnosis: chainColors.gnosis,
  Celo: chainColors.celo,
  zkSync: chainColors.zkSync,
  Scroll: chainColors.scroll,
  Linea: chainColors.linea,
  Mantle: chainColors.mantle,
};

function getChainColor(chainName: string): string {
  return CHAIN_COLOR_MAP[chainName] || baseColors.gray[400];
}

export function GasFeeComparison({ data, loading = false }: GasFeeComparisonProps) {
  const t = useTranslations();
  const [sortBy, setSortBy] = useState<'update' | 'verification' | 'total'>('total');

  const processedData = useMemo(() => {
    return data
      .map((item) => ({
        ...item,
        total: item.updateFee + item.verificationFee,
      }))
      .sort((a, b) => {
        switch (sortBy) {
          case 'update':
            return b.updateFee - a.updateFee;
          case 'verification':
            return b.verificationFee - a.verificationFee;
          case 'total':
          default:
            return b.total - a.total;
        }
      });
  }, [data, sortBy]);

  const statistics = useMemo(() => {
    if (processedData.length === 0) return null;

    const updateFees = processedData.map((d) => d.updateFee);
    const verificationFees = processedData.map((d) => d.verificationFee);
    const totals = processedData.map((d) => d.total);

    const cheapest = processedData[processedData.length - 1];
    const mostExpensive = processedData[0];

    return {
      avgUpdate: updateFees.reduce((a, b) => a + b, 0) / updateFees.length,
      avgVerification: verificationFees.reduce((a, b) => a + b, 0) / verificationFees.length,
      avgTotal: totals.reduce((a, b) => a + b, 0) / totals.length,
      cheapest,
      mostExpensive,
      savings: mostExpensive
        ? ((mostExpensive.total - cheapest.total) / mostExpensive.total) * 100
        : 0,
    };
  }, [processedData]);

  const formatCurrency = (value: number) => {
    if (value === undefined || value === null || isNaN(value)) return '-';
    if (value < 0.01) return `<$0.01`;
    return `$${value.toFixed(2)}`;
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: GasFeeData & { total: number } }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-lg min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getChainColor(data.chain) }}
          />
          <span className="font-medium text-gray-900">{data.chain}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{t('gasFeeComparison.updateFee')}:</span>
            <span className="font-mono">{formatCurrency(data.updateFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('gasFeeComparison.verificationFee')}:</span>
            <span className="font-mono">{formatCurrency(data.verificationFee)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-gray-100">
            <span className="text-gray-600 font-medium">{t('gasFeeComparison.total')}:</span>
            <span className="font-mono font-bold" style={{ color: baseColors.primary[600] }}>
              {formatCurrency(data.total)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardCard title={t('gasFeeComparison.title')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={t('gasFeeComparison.title')}>
      <div className="space-y-4">
        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{t('gasFeeComparison.avgUpdateFee')}</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(statistics.avgUpdate)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">
                {t('gasFeeComparison.avgVerificationFee')}
              </p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(statistics.avgVerification)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{t('gasFeeComparison.cheapestChain')}</p>
              <p className="text-lg font-bold" style={{ color: semanticColors.success.DEFAULT }}>
                {statistics.cheapest?.chain || '-'}
              </p>
              <p className="text-xs text-gray-500">
                {statistics.cheapest ? formatCurrency(statistics.cheapest.total) : '-'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{t('gasFeeComparison.maxSavings')}</p>
              <p className="text-lg font-bold" style={{ color: semanticColors.success.DEFAULT }}>
                {statistics.savings.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">vs {statistics.mostExpensive?.chain || '-'}</p>
            </div>
          </div>
        )}

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('gasFeeComparison.sort')}:</span>
          <div className="flex items-center gap-1">
            {(['total', 'update', 'verification'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  sortBy === key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {key === 'total'
                  ? t('gasFeeComparison.total')
                  : key === 'update'
                    ? t('gasFeeComparison.update')
                    : t('gasFeeComparison.verification')}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartColors.recharts.grid}
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="chain"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickLine={false}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: animationColors.fade.cursor }} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getChainColor(entry.chain)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chain comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('gasFeeComparison.chain')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('gasFeeComparison.updateFee')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('gasFeeComparison.verificationFee')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('gasFeeComparison.total')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('gasFeeComparison.rank')}
                </th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((item, index) => (
                <tr
                  key={item.chain}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: getChainColor(item.chain) }}
                      />
                      <span className="font-medium text-gray-900">{item.chain}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-mono">
                    {formatCurrency(item.updateFee)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">
                    {formatCurrency(item.verificationFee)}
                  </td>
                  <td
                    className="py-2 px-3 text-right font-mono font-medium"
                    style={{ color: baseColors.primary[600] }}
                  >
                    {formatCurrency(item.total)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                        index === 0
                          ? 'bg-green-100 text-green-700'
                          : index === 1
                            ? 'bg-yellow-100 text-yellow-700'
                            : index === 2
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardCard>
  );
}

export default GasFeeComparison;
