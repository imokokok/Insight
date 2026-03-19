import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
import { OracleProvider } from '@/types/oracle';
import { baseColors, chartColors } from '@/lib/config/colors';
import { PriceDeviationHistoryChart } from '../PriceDeviationHistoryChart';
import {
  oracleNames,
  oracleColors,
  PriceComparisonData,
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

interface ComparisonChartsProps {
  deviationChartData: DeviationChartDataItem[];
  chartData: ChartDataItem[];
  radarData: RadarMetric[];
  lineChartData: LineChartDataPoint[];
  priceStats: PriceStats | null;
  selectedOracles: OracleProvider[];
  priceHistory: Record<OracleProvider, { timestamp: number; price: number }[]>;
  priceData: PriceComparisonData[];
  performanceData?: typeof defaultPerformanceData;
}

export function ComparisonCharts({
  deviationChartData,
  chartData,
  radarData,
  lineChartData,
  priceStats,
  selectedOracles,
  priceHistory,
  priceData,
  performanceData = defaultPerformanceData,
}: ComparisonChartsProps) {
  const t = useTranslations();

  return (
    <>
      {deviationChartData.length > 0 && (
        <div className="py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('crossOracle.priceDifferenceVisualization')}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deviationChartData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 80, bottom: 10 }}
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
                  tick={{ fontSize: 11 }}
                />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                <Tooltip
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
                />
                <ReferenceLine x={0} stroke={chartColors.recharts.axis} strokeWidth={1} />
                <Bar dataKey="deviation">
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
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-green-500"></div>
              <span className="text-gray-600">{t('crossOracle.aboveAverage')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-500"></div>
              <span className="text-gray-600">{t('crossOracle.belowAverage')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-gray-600"></div>
              <span className="text-gray-600">{t('crossOracle.zeroLineAverage')}</span>
            </div>
          </div>
        </div>
      )}

      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          {t('crossOracle.multiOraclePriceComparison')}
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={lineChartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[100]} />
              <XAxis dataKey="time" tickFormatter={() => ''} />
              <YAxis
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value?.toFixed(2) || 0}`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value, name) => [`$${Number(value)?.toFixed(2) || 0}`, String(name)]}
                labelFormatter={() => t('crossOracle.priceHistory')}
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
                label={{ value: t('crossOracle.average'), position: 'right', fontSize: 10 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <PriceDeviationHistoryChart
        priceHistory={Object.fromEntries(
          Object.entries(priceHistory).map(([k, v]) => [k, v.map((p) => p.price)])
        )}
        selectedOracles={selectedOracles}
        oracleColors={oracleColors}
        oracleNames={oracleNames}
        chainlinkPrice={priceData.find((d) => d.provider === OracleProvider.CHAINLINK)?.price}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('crossOracle.currentPriceComparison')}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[100]} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, t('crossOracle.price')]}
                />
                <Bar dataKey="price">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('crossOracle.priceTrendComparison')}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[100]} />
                <XAxis dataKey="time" tickFormatter={() => ''} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                <Tooltip />
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

      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          {t('crossOracle.updateFrequencyComparison')}
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={performanceData.map((p) => ({
                name: oracleNames[p.provider],
                frequency: p.updateFrequency,
                color: oracleColors[p.provider],
              }))}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[100]} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis
                scale="log"
                domain={[0.01, 10000]}
                tickFormatter={(value) => {
                  if (value < 1) return `${(value * 1000).toFixed(0)}ms`;
                  if (value < 60) return `${value.toFixed(0)}s`;
                  if (value < 3600) return `${(value / 60).toFixed(0)}m`;
                  return `${(value / 3600).toFixed(0)}h`;
                }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
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
              />
              <Bar dataKey="frequency">
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={oracleColors[entry.provider]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
            <span className="text-gray-600">{t('crossOracle.highFrequency')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gray-400"></div>
            <span className="text-gray-600">{t('crossOracle.standardFrequency')}</span>
          </div>
        </div>
      </div>

      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          {t('crossOracle.comprehensivePerformanceRadar')}
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 10, right: 60, left: 60, bottom: 10 }}>
              <PolarGrid stroke={baseColors.gray[200]} />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
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
    </>
  );
}
