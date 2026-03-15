'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { AnomalyData, AnomalyLevel } from '../types';
import { getAnomalyLevelColor } from '@/lib/analytics/anomalyDetection';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  GitBranch,
  BarChart3,
  Unlink,
  X,
} from 'lucide-react';

interface AnomalyAlertProps {
  anomalies: AnomalyData[];
  loading?: boolean;
  onAcknowledge?: (id: string) => void;
  maxDisplay?: number;
}

export default function AnomalyAlert({
  anomalies,
  loading,
  onAcknowledge,
  maxDisplay = 5,
}: AnomalyAlertProps) {
  const { locale } = useI18n();
  const [expanded, setExpanded] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<AnomalyLevel | 'all'>('all');

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">
            {locale === 'zh-CN' ? '异常预警' : 'Anomaly Alerts'}
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-16" />
          ))}
        </div>
      </div>
    );
  }

  // 过滤未确认的异常
  const unacknowledgedAnomalies = anomalies.filter((a) => !a.acknowledged);

  // 按等级过滤
  const filteredAnomalies =
    selectedLevel === 'all'
      ? unacknowledgedAnomalies
      : unacknowledgedAnomalies.filter((a) => a.level === selectedLevel);

  // 按等级统计
  const countByLevel = unacknowledgedAnomalies.reduce(
    (acc, anomaly) => {
      acc[anomaly.level] = (acc[anomaly.level] || 0) + 1;
      return acc;
    },
    {} as Record<AnomalyLevel, number>
  );

  const getLevelLabel = (level: AnomalyLevel): string => {
    const labels: Record<AnomalyLevel, string> = {
      low: locale === 'zh-CN' ? '低' : 'Low',
      medium: locale === 'zh-CN' ? '中' : 'Medium',
      high: locale === 'zh-CN' ? '高' : 'High',
      critical: locale === 'zh-CN' ? '极高' : 'Critical',
    };
    return labels[level];
  };

  const getAnomalyIconComponent = (type: AnomalyData['type']) => {
    switch (type) {
      case 'price_spike':
        return <TrendingUp className="w-4 h-4" />;
      case 'price_drop':
        return <TrendingDown className="w-4 h-4" />;
      case 'volatility_spike':
        return <Activity className="w-4 h-4" />;
      case 'trend_break':
        return <GitBranch className="w-4 h-4" />;
      case 'volume_anomaly':
        return <BarChart3 className="w-4 h-4" />;
      case 'correlation_break':
        return <Unlink className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getAnomalyTypeText = (type: AnomalyData['type']): string => {
    const texts: Record<AnomalyData['type'], string> = {
      price_spike: locale === 'zh-CN' ? '价格暴涨' : 'Price Spike',
      price_drop: locale === 'zh-CN' ? '价格暴跌' : 'Price Drop',
      volatility_spike: locale === 'zh-CN' ? '波动率激增' : 'Volatility Spike',
      trend_break: locale === 'zh-CN' ? '趋势突变' : 'Trend Break',
      volume_anomaly: locale === 'zh-CN' ? '成交量异常' : 'Volume Anomaly',
      correlation_break: locale === 'zh-CN' ? '相关性断裂' : 'Correlation Break',
    };
    return texts[type];
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    // 小于1小时
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return locale === 'zh-CN' ? `${minutes}分钟前` : `${minutes}m ago`;
    }
    // 小于24小时
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return locale === 'zh-CN' ? `${hours}小时前` : `${hours}h ago`;
    }

    return date.toLocaleDateString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayAnomalies = filteredAnomalies.slice(0, maxDisplay);
  const hasMore = filteredAnomalies.length > maxDisplay;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-5 h-5 text-amber-500" />
            {unacknowledgedAnomalies.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {Math.min(unacknowledgedAnomalies.length, 9)}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {locale === 'zh-CN' ? '异常预警' : 'Anomaly Alerts'}
          </h3>
          <span className="text-sm text-gray-500">
            ({unacknowledgedAnomalies.length} {locale === 'zh-CN' ? '未确认' : 'unacknowledged'})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 等级统计 */}
          {(['critical', 'high', 'medium', 'low'] as AnomalyLevel[]).map((level) =>
            countByLevel[level] ? (
              <span
                key={level}
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${getAnomalyLevelColor(level)}20`,
                  color: getAnomalyLevelColor(level),
                }}
              >
                {getLevelLabel(level)} {countByLevel[level]}
              </span>
            ) : null
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <>
          {/* 过滤器 */}
          {unacknowledgedAnomalies.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">
                {locale === 'zh-CN' ? '过滤:' : 'Filter:'}
              </span>
              <button
                onClick={() => setSelectedLevel('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedLevel === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {locale === 'zh-CN' ? '全部' : 'All'}
              </button>
              {(['critical', 'high', 'medium', 'low'] as AnomalyLevel[]).map((level) =>
                countByLevel[level] ? (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedLevel === level
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor:
                        selectedLevel === level ? getAnomalyLevelColor(level) : undefined,
                    }}
                  >
                    {getLevelLabel(level)} ({countByLevel[level]})
                  </button>
                ) : null
              )}
            </div>
          )}

          {/* 异常列表 */}
          <div className="max-h-96 overflow-y-auto">
            {displayAnomalies.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">
                  {locale === 'zh-CN' ? '暂无异常检测' : 'No anomalies detected'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {locale === 'zh-CN'
                    ? '系统运行正常，持续监控中...'
                    : 'System operating normally, monitoring...'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {displayAnomalies.map((anomaly) => (
                  <div key={anomaly.id} className="p-4 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-start gap-3">
                      {/* 图标 */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${getAnomalyLevelColor(anomaly.level)}15`,
                          color: getAnomalyLevelColor(anomaly.level),
                        }}
                      >
                        {getAnomalyIconComponent(anomaly.type)}
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {getAnomalyTypeText(anomaly.type)}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${getAnomalyLevelColor(anomaly.level)}20`,
                              color: getAnomalyLevelColor(anomaly.level),
                            }}
                          >
                            {getLevelLabel(anomaly.level)}
                          </span>
                          {anomaly.asset && (
                            <span className="text-xs text-gray-500">{anomaly.asset}</span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-2">{anomaly.description}</p>

                        {/* 详情 */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(anomaly.timestamp)}
                          </span>
                          <span>
                            {locale === 'zh-CN' ? '偏离: ' : 'Deviation: '}
                            {anomaly.deviation.toFixed(2)}σ
                          </span>
                          {anomaly.duration > 0 && (
                            <span>
                              {locale === 'zh-CN' ? '持续: ' : 'Duration: '}
                              {anomaly.duration}m
                            </span>
                          )}
                        </div>

                        {/* 数值对比 */}
                        <div className="mt-2 flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-gray-400">
                              {locale === 'zh-CN' ? '当前: ' : 'Current: '}
                            </span>
                            <span className="font-medium text-gray-700">
                              {anomaly.value.toFixed(4)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">
                              {locale === 'zh-CN' ? '预期: ' : 'Expected: '}
                            </span>
                            <span className="font-medium text-gray-700">
                              {anomaly.expectedValue.toFixed(4)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">
                              {locale === 'zh-CN' ? '差异: ' : 'Diff: '}
                            </span>
                            <span
                              className={`font-medium ${
                                anomaly.value > anomaly.expectedValue
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }`}
                            >
                              {(
                                ((anomaly.value - anomaly.expectedValue) / anomaly.expectedValue) *
                                100
                              ).toFixed(2)}
                              %
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 确认按钮 */}
                      {onAcknowledge && (
                        <button
                          onClick={() => onAcknowledge(anomaly.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                          title={locale === 'zh-CN' ? '确认' : 'Acknowledge'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 更多提示 */}
            {hasMore && (
              <div className="p-3 text-center text-sm text-gray-500 border-t border-gray-100">
                {locale === 'zh-CN'
                  ? `还有 ${filteredAnomalies.length - maxDisplay} 个异常未显示`
                  : `${filteredAnomalies.length - maxDisplay} more anomalies not shown`}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
