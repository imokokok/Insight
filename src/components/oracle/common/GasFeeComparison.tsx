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
import { OracleProvider } from '@/lib/types/oracle';
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
};

const ORACLE_COLORS: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: '#375BD2',
  [OracleProvider.BAND_PROTOCOL]: '#9B51E0',
  [OracleProvider.UMA]: '#FF6B6B',
  [OracleProvider.PYTH]: '#EC4899',
  [OracleProvider.API3]: '#10B981',
};

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627EEA',
  arbitrum: '#28A0F0',
  optimism: '#FF0420',
  polygon: '#8247E5',
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
        return '每小时成本';
      case 'daily':
        return '每日成本';
      case 'monthly':
        return '每月成本';
      default:
        return '每日成本';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-[220px]">
        <p className="text-sm font-semibold text-gray-900 mb-2">{data.oracle}</p>
        <p className="text-xs text-gray-500 mb-2">{data.chain}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">单次更新成本</span>
            <span className="text-sm font-medium">${data.updateCost.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">更新频率</span>
            <span className="text-sm font-medium">{data.updateFrequency} 次/小时</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">每小时成本</span>
            <span className="text-sm font-medium">${data.hourlyCost.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">每日成本</span>
            <span className="text-sm font-medium">${data.dailyCost.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">每月成本</span>
            <span className="text-sm font-medium">${data.monthlyCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">平均Gas价格</span>
            <span className="text-sm font-medium">{data.avgGasPrice.toFixed(2)} Gwei</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">效率评分</span>
            <span className="text-sm font-bold text-blue-600">{data.efficiency.toFixed(1)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <DashboardCard title="Gas费用对比分析" className={className}>
        <div className="h-80 flex items-center justify-center text-gray-400">暂无Gas费用数据</div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardCard title="Gas费用对比分析" className={className}>
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">视图:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setViewMode('cost')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    viewMode === 'cost'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  成本对比
                </button>
                <button
                  onClick={() => setViewMode('efficiency')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    viewMode === 'efficiency'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  效率评分
                </button>
                <button
                  onClick={() => setViewMode('frequency')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    viewMode === 'frequency'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  更新频率
                </button>
              </div>
            </div>

            {viewMode === 'cost' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">时间范围:</span>
                <select
                  value={timeFrame}
                  onChange={(e) => setTimeFrame(e.target.value as any)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hourly">每小时</option>
                  <option value="daily">每日</option>
                  <option value="monthly">每月</option>
                </select>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">平均每日成本</p>
                <p className="text-2xl font-bold text-blue-600">${stats.avgCost.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">最低成本</p>
                <p className="text-2xl font-bold text-green-600">${stats.minCost.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">最高成本</p>
                <p className="text-2xl font-bold text-orange-600">${stats.maxCost.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">平均更新频率</p>
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
                  ? '效率评分'
                  : '更新频率 (次/小时)'}
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
                    radius={[0, 4, 4, 0]}
                    maxBarSize={40}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          viewMode === 'efficiency'
                            ? entry.efficiency > 80
                              ? '#10B981'
                              : entry.efficiency > 50
                                ? '#F59E0B'
                                : '#EF4444'
                            : ORACLE_COLORS[entry.oracleId as OracleProvider] || '#6B7280'
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
                    预言机
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    链
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    单次成本
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    更新频率
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    每日成本
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    每月成本
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    效率评分
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chartData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor:
                              ORACLE_COLORS[row.oracleId as OracleProvider] || '#6B7280',
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
                      {row.updateFrequency} 次/小时
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
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Gas费用分析说明</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • <strong>单次更新成本</strong>: 预言机单次价格更新所需的Gas费用（以USD计）
              </li>
              <li>
                • <strong>更新频率</strong>: 预言机每小时的价格更新次数
              </li>
              <li>
                • <strong>每日/每月成本</strong>: 基于更新频率计算的周期性运营成本
              </li>
              <li>
                • <strong>效率评分</strong>: 综合考虑成本和频率的评分，100分为最优
              </li>
              <li>• 低频率、低成本的预言机通常具有更高的效率评分</li>
            </ul>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
