'use client';

import { useState, useMemo } from 'react';
import { ComparisonData } from '../types';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { TooltipProps } from '@/types/ui/recharts';
import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import {
  Check,
  ChevronDown,
  Trophy,
  Target,
  Zap,
  Shield,
  Globe,
  Layers,
  Clock,
  TrendingUp,
  BarChart3,
  X,
} from 'lucide-react';
import { chartColors } from '@/lib/config/colors';


interface OracleComparisonProps {
  data: ComparisonData[];
  loading?: boolean;
}

const MAX_SELECTION = 4;

const METRIC_ICONS: Record<string, React.ReactNode> = {
  tvs: <TrendingUp className="w-4 h-4" />,
  latency: <Zap className="w-4 h-4" />,
  accuracy: <Shield className="w-4 h-4" />,
  marketShare: <Target className="w-4 h-4" />,
  chains: <Globe className="w-4 h-4" />,
  protocols: <Layers className="w-4 h-4" />,
  updateFrequency: <Clock className="w-4 h-4" />,
};

const METRIC_LABELS: Record<string, { en: string; zh: string }> = {
  tvs: { en: 'TVS', zh: 'TVS' },
  latency: { en: 'Latency', zh: '延迟' },
  accuracy: { en: 'Accuracy', zh: '准确率' },
  marketShare: { en: 'Market Share', zh: '市场份额' },
  chains: { en: 'Chains', zh: '支持链数' },
  protocols: { en: 'Protocols', zh: '协议数' },
  updateFrequency: { en: 'Update Freq', zh: '更新频率' },
};

export default function OracleComparison({ data, loading = false }: OracleComparisonProps) {
  const locale = useLocale();
  const [selectedOracles, setSelectedOracles] = useState<string[]>(['Chainlink', 'Pyth Network']);
  const [showSelector, setShowSelector] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter((d) => selectedOracles.includes(d.oracle));
  }, [data, selectedOracles]);

  const radarData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const metrics = Object.keys(filteredData[0].metrics) as Array<keyof ComparisonData['metrics']>;

    return metrics.map((metricKey) => {
      const point: Record<string, string | number> = {
        metric: METRIC_LABELS[metricKey]?.[isChineseLocale(locale) ? 'zh' : 'en'] || metricKey,
        fullMark: 100,
      };

      filteredData.forEach((oracle) => {
        point[oracle.oracle] = oracle.metrics[metricKey].normalizedValue;
      });

      return point;
    });
  }, [filteredData, locale]);

  const toggleOracle = (oracleName: string) => {
    setSelectedOracles((prev) => {
      if (prev.includes(oracleName)) {
        return prev.filter((o) => o !== oracleName);
      }
      if (prev.length >= MAX_SELECTION) {
        return prev;
      }
      return [...prev, oracleName];
    });
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<(typeof radarData)[0]>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-2 min-w-[160px]">
          <p className="font-medium text-gray-900 mb-1.5 text-sm">{label}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-600">{entry.name}:</span>
                </div>
                <span className="font-medium text-gray-900">{Number(entry.value).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent animate-spin rounded-full" />
          <span className="text-gray-500 text-sm">
            {isChineseLocale(locale) ? '加载中...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {isChineseLocale(locale) ? '暂无对比数据' : 'No comparison data available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 选择器 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 transition-colors rounded-md"
          >
            <span className="text-sm text-gray-700">
              {isChineseLocale(locale)
                ? `已选择 ${selectedOracles.length}/${MAX_SELECTION} 个预言机`
                : `${selectedOracles.length}/${MAX_SELECTION} Oracles Selected`}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                showSelector ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showSelector && (
            <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-gray-200 rounded-lg z-10">
              <div className="p-1.5">
                <p className="text-xs text-gray-500 mb-1.5 px-2">
                  {isChineseLocale(locale)
                    ? `选择 2-${MAX_SELECTION} 个预言机进行对比`
                    : `Select 2-${MAX_SELECTION} oracles to compare`}
                </p>
                {data.map((oracle) => (
                  <button
                    key={oracle.oracle}
                    onClick={() => toggleOracle(oracle.oracle)}
                    disabled={
                      !selectedOracles.includes(oracle.oracle) &&
                      selectedOracles.length >= MAX_SELECTION
                    }
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors rounded ${
                      selectedOracles.includes(oracle.oracle)
                        ? 'bg-primary-50 text-primary-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    } ${
                      !selectedOracles.includes(oracle.oracle) &&
                      selectedOracles.length >= MAX_SELECTION
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded"
                        style={{ backgroundColor: oracle.color }}
                      />
                      <span className="text-sm">{oracle.oracle}</span>
                    </div>
                    {selectedOracles.includes(oracle.oracle) && (
                      <Check className="w-3.5 h-3.5 text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 已选择的预言机标签 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedOracles.map((oracleName) => {
            const oracle = data.find((d) => d.oracle === oracleName);
            if (!oracle) return null;
            return (
              <div
                key={oracleName}
                className="flex items-center gap-1.5 px-2 py-1 text-sm border rounded"
                style={{
                  backgroundColor: `${oracle.color}15`,
                  color: oracle.color,
                  borderColor: `${oracle.color}40`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded" style={{ backgroundColor: oracle.color }} />
                {oracleName}
                <button onClick={() => toggleOracle(oracleName)} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {selectedOracles.length < 2 ? (
        <div className="py-12 flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              {isChineseLocale(locale)
                ? '请至少选择 2 个预言机进行对比'
                : 'Please select at least 2 oracles to compare'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 雷达图 */}
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 16, right: 60, bottom: 16, left: 60 }}>
                <PolarGrid stroke={chartColors.recharts.grid} />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: chartColors.recharts.tick, fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: chartColors.recharts.axis, fontSize: 10 }}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend />
                {filteredData.map((oracle) => (
                  <Radar
                    key={oracle.oracle}
                    name={oracle.oracle}
                    dataKey={oracle.oracle}
                    stroke={oracle.color}
                    fill={oracle.color}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* 指标对比表格 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {isChineseLocale(locale) ? '指标' : 'Metric'}
                  </th>
                  {filteredData.map((oracle) => (
                    <th
                      key={oracle.oracle}
                      className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider"
                      style={{ color: oracle.color }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {oracle.rank === 1 && <Trophy className="w-3 h-3" />}
                        {oracle.oracle}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(filteredData[0]?.metrics || {}).map(([key, metric]) => {
                  const metricKey = key as keyof ComparisonData['metrics'];
                  const label =
                    METRIC_LABELS[metricKey]?.[isChineseLocale(locale) ? 'zh' : 'en'] || key;
                  const icon = METRIC_ICONS[metricKey];

                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{icon}</span>
                          <span className="text-sm text-gray-700">{label}</span>
                        </div>
                      </td>
                      {filteredData.map((oracle) => {
                        const value = oracle.metrics[metricKey];
                        const isBest = value.rank === 1;

                        return (
                          <td key={oracle.oracle} className="px-3 py-2.5 text-center">
                            <div className="flex flex-col items-center">
                              <span
                                className={`text-sm font-medium ${
                                  isBest ? 'text-success-600' : 'text-gray-900'
                                }`}
                              >
                                {value.value}
                                {value.unit && (
                                  <span className="text-xs text-gray-500 ml-0.5">{value.unit}</span>
                                )}
                              </span>
                              <div className="w-14 h-1 bg-gray-100 mt-1 overflow-hidden">
                                <div
                                  className="h-full transition-all duration-500"
                                  style={{
                                    width: `${value.normalizedValue}%`,
                                    backgroundColor: oracle.color,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 综合评分 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {filteredData.map((oracle) => (
              <div key={oracle.oracle} className="py-3 text-center border-t border-gray-100">
                <div className="text-xl font-semibold" style={{ color: oracle.color }}>
                  {oracle.overallScore}
                </div>
                <div className="text-xs text-gray-600">
                  {isChineseLocale(locale) ? '综合评分' : 'Overall Score'}
                </div>
                <div className="text-xs text-gray-400">
                  {isChineseLocale(locale) ? '排名 #' : 'Rank #'}
                  {oracle.rank}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
