'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useI18n } from '@/lib/i18n/context';

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y';
type AccuracyView = 'daily' | 'weekly' | 'monthly';

interface HistoricalPricePoint {
  timestamp: number;
  date: string;
  chainlinkPrice: number;
  marketPrice: number;
  deviation: number;
  deviationPercent: number;
  isAnomaly: boolean;
}

interface AccuracyStats {
  overallAccuracy: number;
  avgDeviation: number;
  maxDeviation: number;
  minDeviation: number;
  stdDeviation: number;
  withinThreshold: number;
  totalDataPoints: number;
  anomalyCount: number;
}

interface AnomalyEvent {
  id: string;
  timestamp: number;
  date: string;
  type: 'spike' | 'drop' | 'stale' | 'manipulation';
  severity: 'low' | 'medium' | 'high';
  deviation: number;
  duration: number;
  description: string;
  resolved: boolean;
}

interface DeviationDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface AccuracyTrend {
  period: string;
  accuracy: number;
  dataPoints: number;
  avgDeviation: number;
}

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y'];

const ACCURACY_VIEWS: { key: AccuracyView; labelKey: string }[] = [
  { key: 'daily', labelKey: 'historicalAccuracy.viewDaily' },
  { key: 'weekly', labelKey: 'historicalAccuracy.viewWeekly' },
  { key: 'monthly', labelKey: 'historicalAccuracy.viewMonthly' },
];

const ANOMALY_COLORS = {
  spike: '#ef4444',
  drop: '#f59e0b',
  stale: '#8b5cf6',
  manipulation: '#dc2626',
};

const SEVERITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

function generateHistoricalData(timeRange: TimeRange): HistoricalPricePoint[] {
  const now = Date.now();
  const data: HistoricalPricePoint[] = [];

  const intervals: Record<TimeRange, { count: number; interval: number }> = {
    '1D': { count: 24, interval: 3600000 },
    '1W': { count: 168, interval: 3600000 },
    '1M': { count: 30, interval: 86400000 },
    '3M': { count: 90, interval: 86400000 },
    '1Y': { count: 365, interval: 86400000 },
  };

  const config = intervals[timeRange];
  const basePrice = 14.5;

  for (let i = config.count - 1; i >= 0; i--) {
    const timestamp = now - i * config.interval;
    const date = new Date(timestamp);

    const trend = Math.sin(i / 20) * 0.5;
    const noise = (Math.random() - 0.5) * 0.3;
    const chainlinkPrice = basePrice + trend + noise;

    const marketNoise = (Math.random() - 0.5) * 0.2;
    const marketPrice =
      chainlinkPrice + marketNoise + (Math.random() > 0.95 ? (Math.random() - 0.5) * 2 : 0);

    const deviation = chainlinkPrice - marketPrice;
    const deviationPercent = (deviation / marketPrice) * 100;

    const isAnomaly = Math.abs(deviationPercent) > 1.5;

    data.push({
      timestamp,
      date:
        timeRange === '1D' || timeRange === '1W'
          ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      chainlinkPrice: Number(chainlinkPrice.toFixed(4)),
      marketPrice: Number(marketPrice.toFixed(4)),
      deviation: Number(deviation.toFixed(4)),
      deviationPercent: Number(deviationPercent.toFixed(3)),
      isAnomaly,
    });
  }

  return data;
}

function generateAnomalyEvents(data: HistoricalPricePoint[]): AnomalyEvent[] {
  const anomalies = data.filter((d) => d.isAnomaly);

  return anomalies.slice(0, 10).map((d, index) => {
    const types: AnomalyEvent['type'][] = ['spike', 'drop', 'stale', 'manipulation'];
    const type = types[Math.floor(Math.random() * types.length)];
    const severity =
      Math.abs(d.deviationPercent) > 2
        ? 'high'
        : Math.abs(d.deviationPercent) > 1
          ? 'medium'
          : 'low';

    return {
      id: `anomaly-${index}`,
      timestamp: d.timestamp,
      date: d.date,
      type,
      severity,
      deviation: d.deviationPercent,
      duration: Math.floor(Math.random() * 30) + 5,
      description:
        type === 'spike'
          ? 'Price spike detected - deviation exceeded threshold'
          : type === 'drop'
            ? 'Price drop detected - significant deviation from market'
            : type === 'stale'
              ? 'Stale data detected - update delay exceeded'
              : 'Potential data manipulation detected',
      resolved: Math.random() > 0.3,
    };
  });
}

function calculateStats(data: HistoricalPricePoint[]): AccuracyStats {
  const deviations = data.map((d) => Math.abs(d.deviationPercent));
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const maxDeviation = Math.max(...deviations);
  const minDeviation = Math.min(...deviations);

  const mean = avgDeviation;
  const squaredDiffs = deviations.map((d) => Math.pow(d - mean, 2));
  const stdDeviation = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length);

  const withinThreshold = deviations.filter((d) => d <= 0.5).length;
  const anomalyCount = data.filter((d) => d.isAnomaly).length;

  const overallAccuracy = ((data.length - anomalyCount) / data.length) * 100;

  return {
    overallAccuracy: Number(overallAccuracy.toFixed(2)),
    avgDeviation: Number(avgDeviation.toFixed(4)),
    maxDeviation: Number(maxDeviation.toFixed(4)),
    minDeviation: Number(minDeviation.toFixed(4)),
    stdDeviation: Number(stdDeviation.toFixed(4)),
    withinThreshold,
    totalDataPoints: data.length,
    anomalyCount,
  };
}

function calculateDistribution(data: HistoricalPricePoint[]): DeviationDistribution[] {
  const ranges = [
    { min: 0, max: 0.1, label: '0-0.1%' },
    { min: 0.1, max: 0.25, label: '0.1-0.25%' },
    { min: 0.25, max: 0.5, label: '0.25-0.5%' },
    { min: 0.5, max: 1.0, label: '0.5-1.0%' },
    { min: 1.0, max: Infinity, label: '>1.0%' },
  ];

  return ranges.map((range) => {
    const count = data.filter((d) => {
      const absDev = Math.abs(d.deviationPercent);
      return absDev >= range.min && absDev < range.max;
    }).length;

    return {
      range: range.label,
      count,
      percentage: Number(((count / data.length) * 100).toFixed(1)),
    };
  });
}

function calculateAccuracyTrend(data: HistoricalPricePoint[], view: AccuracyView): AccuracyTrend[] {
  const trends: AccuracyTrend[] = [];

  if (view === 'daily') {
    const last7Days = data.slice(-7);
    last7Days.forEach((d) => {
      const withinThreshold = Math.abs(d.deviationPercent) <= 0.5;
      trends.push({
        period: d.date,
        accuracy: withinThreshold ? 100 : 85,
        dataPoints: 24,
        avgDeviation: Math.abs(d.deviationPercent),
      });
    });
  } else if (view === 'weekly') {
    for (let i = 0; i < 4; i++) {
      const weekData = data.slice(i * 7, (i + 1) * 7);
      if (weekData.length > 0) {
        const avgDev =
          weekData.reduce((a, b) => a + Math.abs(b.deviationPercent), 0) / weekData.length;
        const accurate = weekData.filter((d) => Math.abs(d.deviationPercent) <= 0.5).length;
        trends.push({
          period: `Week ${i + 1}`,
          accuracy: Number(((accurate / weekData.length) * 100).toFixed(1)),
          dataPoints: weekData.length,
          avgDeviation: Number(avgDev.toFixed(3)),
        });
      }
    }
  } else {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    for (let i = 0; i < 6; i++) {
      const monthData = data.slice(i * 30, (i + 1) * 30);
      if (monthData.length > 0) {
        const avgDev =
          monthData.reduce((a, b) => a + Math.abs(b.deviationPercent), 0) / monthData.length;
        const accurate = monthData.filter((d) => Math.abs(d.deviationPercent) <= 0.5).length;
        trends.push({
          period: months[(new Date().getMonth() - 5 + i + 12) % 12],
          accuracy: Number(((accurate / monthData.length) * 100).toFixed(1)),
          dataPoints: monthData.length,
          avgDeviation: Number(avgDev.toFixed(3)),
        });
      }
    }
  }

  return trends;
}

export function HistoricalAccuracy() {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [accuracyView, setAccuracyView] = useState<AccuracyView>('daily');
  const [historicalData, setHistoricalData] = useState<HistoricalPricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        const data = generateHistoricalData(timeRange);
        setHistoricalData(data);
        setLoading(false);
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [timeRange]);

  const stats = useMemo(() => calculateStats(historicalData), [historicalData]);
  const anomalyEvents = useMemo(() => generateAnomalyEvents(historicalData), [historicalData]);
  const distribution = useMemo(() => calculateDistribution(historicalData), [historicalData]);
  const accuracyTrend = useMemo(
    () => calculateAccuracyTrend(historicalData, accuracyView),
    [historicalData, accuracyView]
  );

  const pieData = [
    {
      name: t('historicalAccuracy.withinThreshold'),
      value: stats.withinThreshold,
      color: '#10b981',
    },
    {
      name: t('historicalAccuracy.outsideThreshold'),
      value: stats.totalDataPoints - stats.withinThreshold,
      color: '#ef4444',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t(`historicalAccuracy.timeRange${range}`)}
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-500">
          {t('historicalAccuracy.lastUpdated')}: {new Date().toLocaleString('zh-CN')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">
            {t('historicalAccuracy.overallAccuracy')}
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.overallAccuracy}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {t('historicalAccuracy.overallAccuracyDesc')}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">{t('historicalAccuracy.avgDeviation')}</div>
          <div className="text-2xl font-bold text-gray-900">{stats.avgDeviation}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {t('historicalAccuracy.avgDeviationDesc')}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">{t('historicalAccuracy.maxDeviation')}</div>
          <div className="text-2xl font-bold text-orange-600">{stats.maxDeviation}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {t('historicalAccuracy.maxDeviationDesc')}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">{t('historicalAccuracy.anomalyCount')}</div>
          <div className="text-2xl font-bold text-red-600">{stats.anomalyCount}</div>
          <div className="text-xs text-gray-500 mt-1">
            {t('historicalAccuracy.anomalyCountDesc')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">{t('historicalAccuracy.stdDeviation')}</div>
          <div className="text-xl font-bold text-gray-900">{stats.stdDeviation}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {t('historicalAccuracy.stdDeviationDesc')}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">
            {t('historicalAccuracy.totalDataPoints')}
          </div>
          <div className="text-xl font-bold text-gray-900">{stats.totalDataPoints}</div>
          <div className="text-xs text-gray-500 mt-1">
            {t('historicalAccuracy.totalDataPointsDesc')}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">
            {t('historicalAccuracy.withinThresholdRate')}
          </div>
          <div className="text-xl font-bold text-green-600">
            {((stats.withinThreshold / stats.totalDataPoints) * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('historicalAccuracy.withinThresholdRateDesc')}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('historicalAccuracy.priceComparisonChart')}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={historicalData.slice(-50)}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  minTickGap={30}
                />
                <YAxis
                  yAxisId="price"
                  stroke="#9ca3af"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  width={70}
                />
                <YAxis
                  yAxisId="deviation"
                  orientation="right"
                  stroke="#9ca3af"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  width={60}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'deviationPercent') {
                      return [`${Number(value).toFixed(3)}%`, t('historicalAccuracy.deviation')];
                    }
                    return [
                      `$${Number(value).toFixed(4)}`,
                      name === 'chainlinkPrice' ? 'Chainlink' : t('historicalAccuracy.marketPrice'),
                    ];
                  }}
                />
                <Legend />
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="marketPrice"
                  fill="#93c5fd"
                  stroke="#3b82f6"
                  fillOpacity={0.3}
                  name={t('historicalAccuracy.marketPrice')}
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="chainlinkPrice"
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name="Chainlink"
                />
                <Line
                  yAxisId="deviation"
                  type="monotone"
                  dataKey="deviationPercent"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name={t('historicalAccuracy.deviationPercent')}
                />
                <ReferenceLine yAxisId="deviation" y={0.5} stroke="#f59e0b" strokeDasharray="3 3" />
                <ReferenceLine
                  yAxisId="deviation"
                  y={-0.5}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('historicalAccuracy.accuracyStatsChart')}
          </h3>
          <div className="flex gap-2">
            {ACCURACY_VIEWS.map((view) => (
              <button
                key={view.key}
                onClick={() => setAccuracyView(view.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  accuracyView === view.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t(view.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={accuracyTrend}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" stroke="#9ca3af" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis
                yAxisId="accuracy"
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                domain={[80, 100]}
                tickFormatter={(value) => `${value}%`}
                width={60}
              />
              <YAxis
                yAxisId="deviation"
                orientation="right"
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
                width={60}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'accuracy') {
                    return [`${Number(value).toFixed(1)}%`, t('historicalAccuracy.accuracy')];
                  }
                  return [`${Number(value).toFixed(3)}%`, t('historicalAccuracy.avgDeviation')];
                }}
              />
              <Legend />
              <Bar
                yAxisId="accuracy"
                dataKey="accuracy"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                name={t('historicalAccuracy.accuracy')}
              />
              <Line
                yAxisId="deviation"
                type="monotone"
                dataKey="avgDeviation"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444', r: 4 }}
                name={t('historicalAccuracy.avgDeviation')}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('historicalAccuracy.deviationDistribution')}
          </h3>

          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="range" stroke="#9ca3af" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'percentage') {
                      return [`${Number(value).toFixed(1)}%`, t('historicalAccuracy.percentage')];
                    }
                    return [value, t('historicalAccuracy.count')];
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === 0
                          ? '#10b981'
                          : index === 1
                            ? '#3b82f6'
                            : index === 2
                              ? '#f59e0b'
                              : index === 3
                                ? '#ef4444'
                                : '#dc2626'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-2">
            {distribution.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{
                      backgroundColor:
                        i === 0
                          ? '#10b981'
                          : i === 1
                            ? '#3b82f6'
                            : i === 2
                              ? '#f59e0b'
                              : i === 3
                                ? '#ef4444'
                                : '#dc2626',
                    }}
                  />
                  <span className="text-gray-600">{d.range}</span>
                </div>
                <span className="font-medium text-gray-900">
                  {d.count} ({d.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('historicalAccuracy.thresholdDistribution')}
          </h3>

          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, t('historicalAccuracy.dataPoints')]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: entry.color }} />
                <span className="text-sm text-gray-600">{entry.name}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">{t('historicalAccuracy.withinThreshold')}:</span>
                <span className="ml-2 font-medium text-green-600">{stats.withinThreshold}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('historicalAccuracy.outsideThreshold')}:</span>
                <span className="ml-2 font-medium text-red-600">
                  {stats.totalDataPoints - stats.withinThreshold}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('historicalAccuracy.anomalyTimeline')}
        </h3>

        {anomalyEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('historicalAccuracy.noAnomalies')}
          </div>
        ) : (
          <div className="space-y-4">
            {anomalyEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${ANOMALY_COLORS[event.type]}20` }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ANOMALY_COLORS[event.type] }}
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {t(`historicalAccuracy.anomalyType_${event.type}`)}
                    </span>
                    <span
                      className="px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: `${SEVERITY_COLORS[event.severity]}20`,
                        color: SEVERITY_COLORS[event.severity],
                      }}
                    >
                      {t(`historicalAccuracy.severity_${event.severity}`)}
                    </span>
                    {event.resolved && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        {t('historicalAccuracy.resolved')}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{event.description}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {t('historicalAccuracy.time')}: {event.date}
                    </span>
                    <span>
                      {t('historicalAccuracy.deviation')}: {event.deviation.toFixed(3)}%
                    </span>
                    <span>
                      {t('historicalAccuracy.duration')}: {event.duration}s
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('historicalAccuracy.deviationHistoryChart')}
        </h3>

        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                minTickGap={30}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
              />
              <Tooltip
                formatter={(value) => [
                  `${Number(value).toFixed(3)}%`,
                  t('historicalAccuracy.deviation'),
                ]}
              />
              <ReferenceLine
                y={0.5}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{ value: '+0.5%', position: 'right', fill: '#f59e0b', fontSize: 10 }}
              />
              <ReferenceLine
                y={-0.5}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{ value: '-0.5%', position: 'right', fill: '#f59e0b', fontSize: 10 }}
              />
              <ReferenceLine
                y={1.0}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: '+1.0%', position: 'right', fill: '#ef4444', fontSize: 10 }}
              />
              <ReferenceLine
                y={-1.0}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: '-1.0%', position: 'right', fill: '#ef4444', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="deviationPercent"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-orange-500" style={{ borderTop: '2px dashed #f59e0b' }} />
            <span className="text-xs text-gray-600">
              {t('historicalAccuracy.warningThreshold')} (±0.5%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-red-500" style={{ borderTop: '2px dashed #ef4444' }} />
            <span className="text-xs text-gray-600">
              {t('historicalAccuracy.criticalThreshold')} (±1.0%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
