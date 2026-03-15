'use client';

import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { OracleProvider } from '@/types/oracle';
import { DashboardCard } from './DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors } from '@/lib/config/colors';

export interface GasFeeData {
  oracle: OracleProvider;
  chain: string;
  updateCost: number; // in USD
  updateFrequency: number; // updates per hour
  avgGasPrice: number; // in Gwei
  lastUpdate: number;
}

export interface GasFeeComparisonProps {
  data: GasFeeData[];
  oracleNames?: Partial<Record<OracleProvider, string>>;
  className?: string;
}

const DEFAULT_ORACLE_NAMES: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
  [OracleProvider.DIA]: 'DIA',
  [OracleProvider.TELLOR]: 'Tellor',
  [OracleProvider.CHRONICLE]: 'Chronicle',
  [OracleProvider.WINKLINK]: 'WINkLink',
};

const ORACLE_COLORS: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
  [OracleProvider.BAND_PROTOCOL]: chartColors.oracle['band-protocol'],
  [OracleProvider.UMA]: chartColors.oracle.uma,
  [OracleProvider.PYTH]: chartColors.oracle['pyth'],
  [OracleProvider.API3]: chartColors.oracle.api3,
  [OracleProvider.REDSTONE]: chartColors.oracle.redstone,
  [OracleProvider.DIA]: '#6366F1',
  [OracleProvider.TELLOR]: '#AA96DA',
  [OracleProvider.CHRONICLE]: '#E11D48',
  [OracleProvider.WINKLINK]: '#FF4D4D',
};

const CHAIN_COLORS: Record<string, string> = {
  ethereum: chartColors.recharts.chainlink,
  arbitrum: '#28A0F0',
  optimism: '#FF0420',
  polygon: chartColors.oracle['pyth'],
  base: '#0052FF',
  avalanche: '#E84142',
  bnb: '#F3BA2F',
  fantom: '#1969FF',
  cosmos: '#2E3148',
  solana: '#14F195',
};

interface ChartDataPoint {
  oracle: string;
  chain: string;
  updateCost: number;
  hourlyCost: number;
  dailyCost: number;
  monthlyCost: number;
  updateFrequency: number;
  avgGasPrice: number;
  efficiency: number;
}

export function GasFeeComparison({
  data,
  oracleNames: customOracleNames,
  className,
}: GasFeeComparisonProps) {
  const { t } = useI18n();
  const oracleNames = { ...DEFAULT_ORACLE_NAMES, ...customOracleNames };
  const [viewMode, setViewMode] = useState<'cost' | 'efficiency' | 'frequency'>('cost');
  const [timeFrame, setTimeFrame] = useState<'hourly' | 'daily' | 'monthly'>('daily');

  const chartData = useMemo(() => {
    return data.map((item) => {
      const hourlyCost = item.updateCost * item.updateFrequency;
      const dailyCost = hourlyCost * 24;
      const monthlyCost = dailyCost * 30;

      // Efficiency score: lower cost = higher efficiency (inverse relationship)
      const efficiency = Math.max(0, 100 - dailyCost * 10);

      return {
        oracle: oracleNames[item.oracle] || item.oracle,
        chain: item.chain,
        updateCost: item.updateCost,
        hourlyCost,
        dailyCost,
        monthlyCost,
        updateFrequency: item.updateFrequency,
        avgGasPrice: item.avgGasPrice,
        efficiency,
        oracleId: item.oracle,
      };
    });
  }, [data, oracleNames]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const costs = chartData.map((d) => d.dailyCost);
    const efficiencies = chartData.map((d) => d.efficiency);
    const frequencies = chartData.map((d) => d.updateFrequency);

    return {
      avgCost: costs.reduce((a, b) => a + b, 0) / costs.length,
      minCost: Math.min(...costs),
      maxCost: Math.max(...costs),
      avgEfficiency: efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length,
      avgFrequency: frequencies.reduce((a, b) => a + b, 0) / frequencies.length,
      totalOracles: data.length,
    };
  }, [chartData, data.length]);

  const getCostField = () => {
    switch (timeFrame) {
      case 'hourly':
        return 'hourlyCost';
      case 'daily':
        return 'dailyCost';
      case 'monthly':
        return 'monthlyCost';
      default:
        return 'dailyCost';
    }
  };

  const getCostLabel = () => {
    switch (timeFrame) {
      case 'hourly':
        return t('gasFee.hourlyCost');
      case 'daily':
        return t('gasFee.dailyCost');
      case 'monthly':
        return t('gasFee.monthlyCost');
      default:
        return t('gasFee.dailyCost');
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-4   border border-gray-200 min-w-[220px]">
        <p className="text-sm font-semibold text-gray-900 mb-2">{data.oracle}</p>
        <p className="text-xs text-gray-500 mb-2">{data.chain}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{t('gasFee.singleUpdateCost')}</span>
            <span className="text-sm font-medium">${data.updateCost.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{t('gasFee.updateFrequency')}</span>
            <span className="text-sm font-medium">
              {data.updateFrequency} {t('gasFee.timesPerHour')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{t('gasFee.hourlyCost')}</span>
            <span className="text-sm font-medium">${data.hourlyCost.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{t('gasFee.dailyCost')}</span>
            <span className="text-sm font-medium">${data.dailyCost.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{t('gasFee.monthlyCost')}</span>
            <span className="text-sm font-medium">${data.monthlyCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{t('gasFee.avgGasPrice')}</span>
            <span className="text-sm font-medium">{data.avgGasPrice.toFixed(2)} Gwei</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{t('gasFee.efficiencyScore')}</span>
            <span className="text-sm font-bold text-blue-600">{data.efficiency.toFixed(1)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <DashboardCard title={t('gasFee.title')} className={className}>
        <div className="h-80 flex items-center justify-center text-gray-400">
          {t('gasFee.noData')}
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardCard title={t('gasFee.title')} className={className}>
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('common.view')}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setViewMode('cost')}
                  className={`px-3 py-1.5 text-sm  transition-colors ${
                    viewMode === 'cost'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('gasFee.costComparison')}
                </button>
                <button
                  onClick={() => setViewMode('efficiency')}
                  className={`px-3 py-1.5 text-sm  transition-colors ${
                    viewMode === 'efficiency'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('gasFee.efficiencyScore')}
                </button>
                <button
                  onClick={() => setViewMode('frequency')}
                  className={`px-3 py-1.5 text-sm  transition-colors ${
                    viewMode === 'frequency'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('gasFee.updateFrequency')}
                </button>
              </div>
            </div>

            {viewMode === 'cost' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t('common.timeRange')}</span>
                <select
                  value={timeFrame}
                  onChange={(e) => setTimeFrame(e.target.value as any)}
                  className="text-sm border border-gray-200  px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hourly">{t('common.hourly')}</option>
                  <option value="daily">{t('common.daily')}</option>
                  <option value="monthly">{t('common.monthly')}</option>
                </select>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-100 border border-gray-200  p-4">
                <p className="text-xs text-gray-600 mb-1">{t('gasFee.avgDailyCost')}</p>
                <p className="text-2xl font-bold text-blue-600">${stats.avgCost.toFixed(4)}</p>
              </div>
              <div className="bg-gray-100 border border-gray-200  p-4">
                <p className="text-xs text-gray-600 mb-1">{t('gasFee.minCost')}</p>
                <p className="text-2xl font-bold text-green-600">${stats.minCost.toFixed(4)}</p>
              </div>
              <div className="bg-gray-100 border border-gray-200  p-4">
                <p className="text-xs text-gray-600 mb-1">{t('gasFee.maxCost')}</p>
                <p className="text-2xl font-bold text-orange-600">${stats.maxCost.toFixed(4)}</p>
              </div>
              <div className="bg-gray-100 border border-gray-200  p-4">
                <p className="text-xs text-gray-600 mb-1">{t('gasFee.avgUpdateFrequency')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.avgFrequency.toFixed(1)}/h
                </p>
              </div>
            </div>
          )}

          {/* Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {viewMode === 'cost'
                ? getCostLabel()
                : viewMode === 'efficiency'
                  ? t('gasFee.efficiencyScore')
                  : `${t('gasFee.updateFrequency')} (${t('gasFee.timesPerHour')})`}
            </h4>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                  <XAxis
                    type="number"
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    tickFormatter={(value) =>
                      viewMode === 'cost'
                        ? `$${value.toFixed(2)}`
                        : viewMode === 'efficiency'
                          ? value.toFixed(0)
                          : value.toFixed(1)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="oracle"
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 12, fill: chartColors.recharts.tickDark }}
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey={
                      viewMode === 'cost'
                        ? getCostField()
                        : viewMode === 'efficiency'
                          ? 'efficiency'
                          : 'updateFrequency'
                    }
                    maxBarSize={40}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          viewMode === 'efficiency'
                            ? entry.efficiency > 80
                              ? chartColors.semantic.success
                              : entry.efficiency > 50
                                ? chartColors.semantic.warning
                                : chartColors.semantic.danger
                            : ORACLE_COLORS[entry.oracleId as OracleProvider] ||
                              chartColors.recharts.tick
                        }
                      />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.oracle')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.chain')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('gasFee.singleCost')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('gasFee.updateFrequency')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('gasFee.dailyCost')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('gasFee.monthlyCost')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('gasFee.efficiencyScore')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chartData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3  mr-2"
                          style={{
                            backgroundColor:
                              ORACLE_COLORS[row.oracleId as OracleProvider] ||
                              chartColors.recharts.tick,
                          }}
                        />
                        <span className="text-sm font-medium text-gray-900">{row.oracle}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {row.chain}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">
                      ${row.updateCost.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {row.updateFrequency} {t('gasFee.timesPerHour')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">
                      ${row.dailyCost.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">
                      ${row.monthlyCost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          row.efficiency > 80
                            ? 'bg-green-100 text-green-700'
                            : row.efficiency > 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {row.efficiency.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Explanation */}
          <div className="bg-blue-50  p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">{t('gasFee.analysisTitle')}</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • <strong>{t('gasFee.singleUpdateCost')}</strong>:{' '}
                {t('gasFee.analysis.singleUpdateCostDesc')}
              </li>
              <li>
                • <strong>{t('gasFee.updateFrequency')}</strong>:{' '}
                {t('gasFee.analysis.updateFrequencyDesc')}
              </li>
              <li>
                •{' '}
                <strong>
                  {t('gasFee.dailyCost')}/{t('gasFee.monthlyCost')}
                </strong>
                : {t('gasFee.analysis.periodicCostDesc')}
              </li>
              <li>
                • <strong>{t('gasFee.efficiencyScore')}</strong>:{' '}
                {t('gasFee.analysis.efficiencyScoreDesc')}
              </li>
              <li>• {t('gasFee.analysis.lowFreqHighEfficiency')}</li>
            </ul>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
