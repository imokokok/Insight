'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  ReferenceLine,
  ComposedChart,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { baseColors, chartColors } from '@/lib/config/colors';
import { type OracleProvider } from '@/types/oracle';

import {
  oracleNames,
  oracleColors,
  type PriceHistoryPoint,
  defaultPerformanceData,
} from './crossOracleConfig';

interface PriceStats {
  avg: number;
  max: number;
  min: number;
  range: number;
  stdDev: number;
  median: number;
}

interface DeviationChartDataItem {
  name: string;
  deviation: number;
  color: string;
  price: number;
}

interface ChartDataItem {
  name: string;
  price: number;
  color: string;
}

interface RadarMetric {
  metric: string;
  [key: string]: string | number;
}

interface LineChartDataPoint {
  time: number;
  [key: string]: number | string | null;
}

interface ChartsTabProps {
  deviationChartData: DeviationChartDataItem[];
  chartData: ChartDataItem[];
  radarData: RadarMetric[];
  lineChartData: LineChartDataPoint[];
  priceStats: PriceStats | null;
  selectedOracles: OracleProvider[];
  priceHistory: Record<OracleProvider, PriceHistoryPoint[]>;
  priceData: { provider: OracleProvider; price: number }[];
  performanceData?: typeof defaultPerformanceData;
}

export function ChartsTab({
  deviationChartData,
  chartData,
  radarData,
  lineChartData,
  priceStats,
  selectedOracles,
  priceHistory,
  priceData,
  performanceData = defaultPerformanceData,
}: ChartsTabProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      {/* 价格偏差可视化 */}
      {deviationChartData.length > 0 && (
        <div className="bg-slate-50/30 p-5">
          <h3 className="text-xs font-normal text-gray-500 mb-4">
            {t('crossOracle.priceDifferenceVisualization')}
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deviationChartData}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 70, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  stroke={baseColors.gray[100]}
                />
                <XAxis
                  type="number"
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  tickFormatter={(value) => `${value.toFixed(2)}%`}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={65}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  formatter={(value) => {
                    const numValue = Number(value);
                    return [
                      `${numValue > 0 ? '+' : ''}${numValue.toFixed(3)}%`,
                      t('crossOracle.stats.deviationFromAverage'),
                    ];
                  }}
                  labelFormatter={(label) =>
                    `${label} - $${deviationChartData.find((d) => d.name === label)?.price.toFixed(2)}`
                  }
                  contentStyle={{
                    fontSize: 12,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
                <ReferenceLine x={0} stroke={chartColors.recharts.axis} strokeWidth={1} />
                <Bar dataKey="deviation" radius={[0, 4, 4, 0]}>
                  {deviationChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.deviation >= 0
                          ? chartColors.recharts.success
                          : chartColors.recharts.danger
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-success-500"></div>
              <span className="text-gray-500">{t('crossOracle.aboveAverage')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-danger-500"></div>
              <span className="text-gray-500">{t('crossOracle.belowAverage')}</span>
            </div>
          </div>
        </div>
      )}

      {/* 多预言机价格对比 & 价格趋势对比 - 2列网格 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 当前价格对比 */}
        <div className="bg-slate-50/30 p-5">
          <h3 className="text-xs font-normal text-gray-500 mb-4">
            {t('crossOracle.currentPriceComparison')}
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={baseColors.gray[100]}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, t('crossOracle.price')]}
                  contentStyle={{
                    fontSize: 12,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 价格趋势对比 */}
        <div className="bg-slate-50/30 p-5">
          <h3 className="text-xs font-normal text-gray-500 mb-4">
            {t('crossOracle.priceTrendComparison')}
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={baseColors.gray[100]}
                  vertical={false}
                />
                <XAxis dataKey="time" tickFormatter={() => ''} axisLine={false} tickLine={false} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    fontSize: 12,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {selectedOracles.map((provider) => (
                  <Line
                    key={provider}
                    type="monotone"
                    dataKey={oracleNames[provider]}
                    stroke={oracleColors[provider]}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 价格历史趋势 */}
      <div className="bg-slate-50/30 p-5">
        <h3 className="text-xs font-normal text-gray-500 mb-4">
          {t('crossOracle.multiOraclePriceComparison')}
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={lineChartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[100]} vertical={false} />
              <XAxis dataKey="time" tickFormatter={() => ''} axisLine={false} tickLine={false} />
              <YAxis
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value?.toFixed(2) || 0}`}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                formatter={(value, name) => [`$${Number(value)?.toFixed(2) || 0}`, String(name)]}
                labelFormatter={() => t('crossOracle.priceHistory')}
                contentStyle={{
                  fontSize: 12,
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {selectedOracles.map((provider) => (
                <Line
                  key={provider}
                  type="monotone"
                  dataKey={oracleNames[provider]}
                  stroke={oracleColors[provider]}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                />
              ))}
              <ReferenceLine
                y={priceStats?.avg}
                stroke={chartColors.recharts.axis}
                strokeDasharray="3 3"
                label={{
                  value: t('crossOracle.average'),
                  position: 'right',
                  fontSize: 10,
                  fill: '#6b7280',
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 更新频率对比 */}
      <div className="bg-slate-50/30 p-5">
        <h3 className="text-xs font-normal text-gray-500 mb-4">
          {t('crossOracle.updateFrequencyComparison')}
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={performanceData.map((p) => ({
                name: oracleNames[p.provider],
                frequency: p.updateFrequency,
                color: oracleColors[p.provider],
              }))}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[100]} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                interval={0}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                scale="log"
                domain={[0.01, 10000]}
                tickFormatter={(value) => {
                  if (value < 1) return `${(value * 1000).toFixed(0)}ms`;
                  if (value < 60) return `${value.toFixed(0)}s`;
                  if (value < 3600) return `${(value / 60).toFixed(0)}m`;
                  return `${(value / 3600).toFixed(0)}h`;
                }}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                formatter={(value) => {
                  const numValue = Number(value);
                  if (numValue < 1)
                    return [`${(numValue * 1000).toFixed(0)} ms`, t('crossOracle.updateFrequency')];
                  if (numValue < 60)
                    return [`${numValue.toFixed(1)} s`, t('crossOracle.updateFrequency')];
                  if (numValue < 3600)
                    return [`${(numValue / 60).toFixed(0)} min`, t('crossOracle.updateFrequency')];
                  return [`${(numValue / 3600).toFixed(1)} h`, t('crossOracle.updateFrequency')];
                }}
                contentStyle={{
                  fontSize: 12,
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="frequency" radius={[4, 4, 0, 0]}>
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={oracleColors[entry.provider]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-primary-500"></div>
            <span className="text-gray-500">{t('crossOracle.highFrequency')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gray-400"></div>
            <span className="text-gray-500">{t('crossOracle.standardFrequency')}</span>
          </div>
        </div>
      </div>

      {/* 综合性能雷达图 */}
      <div className="bg-slate-50/30 p-5">
        <h3 className="text-xs font-normal text-gray-500 mb-4">
          {t('crossOracle.comprehensivePerformanceRadar')}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 10, right: 50, left: 50, bottom: 10 }}>
              <PolarGrid stroke={baseColors.gray[200]} />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              {selectedOracles.map((provider) => (
                <Radar
                  key={provider}
                  name={oracleNames[provider]}
                  dataKey={oracleNames[provider]}
                  stroke={oracleColors[provider]}
                  fill={oracleColors[provider]}
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
