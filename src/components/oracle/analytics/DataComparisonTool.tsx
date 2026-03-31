'use client';

import { useState, useCallback, useMemo } from 'react';

import {
  GitCompare,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  ReferenceLine,
  Cell,
} from 'recharts';

import useAPI3Analytics, {
  type DataSource,
  type TimeRange,
  type ComparisonResult,
} from '@/hooks/useAPI3Analytics';
import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';

export interface DataComparisonToolProps {
  dataSources: DataSource[];
  metrics: string[];
  timeRange: TimeRange;
}

const mockChains = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'optimism', name: 'Optimism' },
  { id: 'base', name: 'Base' },
];

const mockDapis = [
  { id: 'eth-usd', name: 'ETH/USD' },
  { id: 'btc-usd', name: 'BTC/USD' },
  { id: 'api3-usd', name: 'API3/USD' },
  { id: 'usdc-usd', name: 'USDC/USD' },
];

export function DataComparisonTool({
  dataSources: initialDataSources,
  metrics,
  timeRange,
}: DataComparisonToolProps) {
  const t = useTranslations();
  const { compareDataSources, calculateCorrelation } = useAPI3Analytics();

  const [source1Id, setSource1Id] = useState<string>('');
  const [source2Id, setSource2Id] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<string>(metrics[0] || 'price');
  const [comparisonType, setComparisonType] = useState<'dapi' | 'chain' | 'timeframe'>('dapi');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const availableSources = useMemo(() => {
    if (comparisonType === 'dapi') {
      return mockDapis.map((d) => ({
        id: d.id,
        name: d.name,
        type: 'dapi' as const,
        data: initialDataSources.find((s) => s.id === d.id)?.data || [],
      }));
    } else if (comparisonType === 'chain') {
      return mockChains.map((c) => ({
        id: c.id,
        name: c.name,
        type: 'chain' as const,
        data: initialDataSources.find((s) => s.id === c.id)?.data || [],
      }));
    }
    return initialDataSources;
  }, [comparisonType, initialDataSources]);

  const handleCompare = useCallback(() => {
    const source1 = availableSources.find((s) => s.id === source1Id);
    const source2 = availableSources.find((s) => s.id === source2Id);

    if (source1 && source2) {
      const result = compareDataSources(source1, source2, selectedMetric);
      setComparisonResult(result);
    }
  }, [source1Id, source2Id, selectedMetric, availableSources, compareDataSources]);

  const chartData = useMemo(() => {
    const source1 = availableSources.find((s) => s.id === source1Id);
    const source2 = availableSources.find((s) => s.id === source2Id);

    if (!source1 || !source2) return [];

    const maxLength = Math.max(source1.data.length, source2.data.length);
    const data = [];

    for (let i = 0; i < maxLength; i++) {
      const d1 = source1.data[i];
      const d2 = source2.data[i];
      if (d1 && d2) {
        data.push({
          time: new Date(d1.timestamp).toLocaleDateString(),
          [source1.name]: d1.value,
          [source2.name]: d2.value,
          difference: d1.value - d2.value,
        });
      }
    }

    return data;
  }, [source1Id, source2Id, availableSources]);

  const correlationData = useMemo(() => {
    const source1 = availableSources.find((s) => s.id === source1Id);
    const source2 = availableSources.find((s) => s.id === source2Id);

    if (!source1 || !source2) return null;

    const values1 = source1.data.map((d) => d.value);
    const values2 = source2.data.map((d) => d.value);
    const minLength = Math.min(values1.length, values2.length);

    return calculateCorrelation(values1.slice(0, minLength), values2.slice(0, minLength));
  }, [source1Id, source2Id, availableSources, calculateCorrelation]);

  const getCorrelationColor = (strength: string) => {
    switch (strength) {
      case 'very_strong':
        return 'text-emerald-600';
      case 'strong':
        return 'text-blue-600';
      case 'moderate':
        return 'text-amber-600';
      case 'weak':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleExport = useCallback(() => {
    if (!comparisonResult) return;

    const exportData = {
      comparison: comparisonResult,
      chartData,
      correlation: correlationData,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${source1Id}-${source2Id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [comparisonResult, chartData, correlationData, source1Id, source2Id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('api3.analytics.comparison.title') || 'Data Comparison Tool'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.analytics.comparison.subtitle') ||
              'Compare data across different dAPIs, chains, or timeframes'}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!comparisonResult}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {t('api3.analytics.comparison.export') || 'Export Results'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('api3.analytics.comparison.comparisonType') || 'Comparison Type'}
            </label>
            <select
              value={comparisonType}
              onChange={(e) => {
                setComparisonType(e.target.value as 'dapi' | 'chain' | 'timeframe');
                setSource1Id('');
                setSource2Id('');
                setComparisonResult(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="dapi">{t('api3.analytics.comparison.dapi') || 'dAPI'}</option>
              <option value="chain">{t('api3.analytics.comparison.chain') || 'Chain'}</option>
              <option value="timeframe">
                {t('api3.analytics.comparison.timeframe') || 'Timeframe'}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('api3.analytics.comparison.source1') || 'Source 1'}
            </label>
            <select
              value={source1Id}
              onChange={(e) => setSource1Id(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select source...</option>
              {availableSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('api3.analytics.comparison.source2') || 'Source 2'}
            </label>
            <select
              value={source2Id}
              onChange={(e) => setSource2Id(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select source...</option>
              {availableSources
                .filter((s) => s.id !== source1Id)
                .map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('api3.analytics.comparison.metric') || 'Metric'}
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {metrics.map((metric) => (
                <option key={metric} value={metric}>
                  {metric}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleCompare}
            disabled={!source1Id || !source2Id}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GitCompare className="w-4 h-4" />
            {t('api3.analytics.comparison.compare') || 'Compare'}
          </button>
        </div>
      </div>

      {comparisonResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              {t('api3.analytics.comparison.comparisonChart') || 'Comparison Chart'}
            </h3>
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={Object.keys(chartData[0])[1]}
                    stroke={chartColors.oracle.api3}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={Object.keys(chartData[0])[2]}
                    stroke={chartColors.oracle.chainlink}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {t('api3.analytics.comparison.summary') || 'Comparison Summary'}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{comparisonResult.dataSource1}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {comparisonResult.value1.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{comparisonResult.dataSource2}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {comparisonResult.value2.toFixed(4)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {t('api3.analytics.comparison.difference') || 'Difference'}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        comparisonResult.difference >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {comparisonResult.difference >= 0 ? '+' : ''}
                      {comparisonResult.difference.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-600">
                      {t('api3.analytics.comparison.percentChange') || 'Percent Change'}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        comparisonResult.percentChange >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {comparisonResult.percentChange >= 0 ? '+' : ''}
                      {comparisonResult.percentChange.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {correlationData && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {t('api3.analytics.comparison.correlation') || 'Correlation Analysis'}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {t('api3.analytics.comparison.coefficient') || 'Coefficient'}
                    </span>
                    <span
                      className={`text-sm font-medium ${getCorrelationColor(correlationData.strength)}`}
                    >
                      {correlationData.coefficient.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {t('api3.analytics.comparison.strength') || 'Strength'}
                    </span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(correlationData.direction)}
                      <span
                        className={`text-sm font-medium ${getCorrelationColor(correlationData.strength)}`}
                      >
                        {correlationData.strength.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {t('api3.analytics.comparison.direction') || 'Direction'}
                    </span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {correlationData.direction}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {chartData.length > 0 && comparisonResult && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            {t('api3.analytics.comparison.differenceChart') || 'Difference Analysis'}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip />
              <ReferenceLine y={0} stroke="#6b7280" />
              <Bar dataKey="difference">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.difference >= 0 ? chartColors.oracle.api3 : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {comparisonResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-emerald-800">
                {t('api3.analytics.comparison.analysisTitle') || 'Analysis Insight'}
              </h4>
              <p className="text-sm text-emerald-700 mt-1">
                {comparisonResult.percentChange > 5
                  ? t('api3.analytics.comparison.highDeviation') ||
                    'Significant deviation detected between sources. This may indicate market inefficiency or data quality issues.'
                  : comparisonResult.percentChange > 1
                    ? t('api3.analytics.comparison.moderateDeviation') ||
                      'Moderate deviation between sources. Values are within acceptable range.'
                    : t('api3.analytics.comparison.lowDeviation') ||
                      'Low deviation between sources. Data is consistent and reliable.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataComparisonTool;
