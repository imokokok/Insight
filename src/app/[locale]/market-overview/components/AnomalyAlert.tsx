'use client';

import { useState } from 'react';
import { AnomalyData } from '../types';
import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import {
  AlertTriangle,
  Bell,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AnomalyAlertProps {
  data: AnomalyData[];
  loading?: boolean;
  onAcknowledge?: (id: string) => void;
}

export default function AnomalyAlert({ data, loading = false, onAcknowledge }: AnomalyAlertProps) {
  const locale = useLocale();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());

  // 过滤已关闭的警报
  const activeAlerts = data.filter((alert) => !dismissedItems.has(alert.id));

  // 按严重程度排序
  const sortedAlerts = [...activeAlerts].sort((a, b) => {
    const levelOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return levelOrder[a.level] - levelOrder[b.level];
  });

  // 切换展开状态
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // 关闭警报
  const dismissAlert = (id: string) => {
    setDismissedItems(new Set(dismissedItems).add(id));
    onAcknowledge?.(id);
  };

  // 获取严重程度样式
  const getLevelStyle = (level: AnomalyData['level']) => {
    switch (level) {
      case 'critical':
        return 'bg-red-50 border-l-2 border-red-500';
      case 'high':
        return 'bg-orange-50 border-l-2 border-orange-500';
      case 'medium':
        return 'bg-yellow-50 border-l-2 border-yellow-500';
      case 'low':
        return 'bg-blue-50 border-l-2 border-blue-500';
      default:
        return 'bg-gray-50 border-l-2 border-gray-500';
    }
  };

  // 获取严重程度图标
  const getLevelIcon = (level: AnomalyData['level']) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Bell className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Activity className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  // 获取严重程度标签
  const getLevelLabel = (level: AnomalyData['level']) => {
    const labels: Record<AnomalyData['level'], string> = {
      critical: isChineseLocale(locale) ? '严重' : 'Critical',
      high: isChineseLocale(locale) ? '高' : 'High',
      medium: isChineseLocale(locale) ? '中' : 'Medium',
      low: isChineseLocale(locale) ? '低' : 'Low',
    };
    return labels[level];
  };

  // 获取类型图标
  const getTypeIcon = (type: AnomalyData['type']) => {
    switch (type) {
      case 'price_spike':
        return <TrendingUp className="w-3.5 h-3.5" />;
      case 'price_drop':
        return <TrendingDown className="w-3.5 h-3.5" />;
      case 'volatility_spike':
        return <Activity className="w-3.5 h-3.5" />;
      case 'trend_break':
        return <TrendingDown className="w-3.5 h-3.5" />;
      case 'volume_anomaly':
        return <Activity className="w-3.5 h-3.5" />;
      case 'correlation_break':
        return <Activity className="w-3.5 h-3.5" />;
      default:
        return <Activity className="w-3.5 h-3.5" />;
    }
  };

  // 获取类型标签
  const getTypeLabel = (type: AnomalyData['type']) => {
    const labels: Record<AnomalyData['type'], string> = {
      price_spike: isChineseLocale(locale) ? '价格飙升' : 'Price Spike',
      price_drop: isChineseLocale(locale) ? '价格暴跌' : 'Price Drop',
      volatility_spike: isChineseLocale(locale) ? '波动率激增' : 'Volatility Spike',
      trend_break: isChineseLocale(locale) ? '趋势突破' : 'Trend Break',
      volume_anomaly: isChineseLocale(locale) ? '交易量异常' : 'Volume Anomaly',
      correlation_break: isChineseLocale(locale) ? '相关性崩溃' : 'Correlation Break',
    };
    return labels[type];
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    // 小于1小时
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return isChineseLocale(locale) ? `${minutes}分钟前` : `${minutes}m ago`;
    }
    // 小于24小时
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return isChineseLocale(locale) ? `${hours}小时前` : `${hours}h ago`;
    }
    // 默认显示日期
    return date.toLocaleDateString(isChineseLocale(locale) ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent animate-spin" />
          <span className="text-gray-500 text-sm">
            {isChineseLocale(locale) ? '加载中...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  if (sortedAlerts.length === 0) {
    return (
      <div className="py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 bg-green-100 border border-green-200 flex items-center justify-center mx-auto mb-2">
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-gray-500 text-sm">
            {isChineseLocale(locale) ? '暂无异常警报' : 'No anomaly alerts'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isChineseLocale(locale) ? '所有指标正常' : 'All indicators normal'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 统计摘要 */}
      <div className="flex items-center gap-3 text-xs mb-3">
        <span className="text-gray-500">
          {isChineseLocale(locale) ? '活跃警报:' : 'Active:'} {sortedAlerts.length}
        </span>
        {sortedAlerts.some((a) => a.level === 'critical') && (
          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 font-medium">
            {sortedAlerts.filter((a) => a.level === 'critical').length}{' '}
            {isChineseLocale(locale) ? '严重' : 'Critical'}
          </span>
        )}
        {sortedAlerts.some((a) => a.level === 'high') && (
          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 font-medium">
            {sortedAlerts.filter((a) => a.level === 'high').length}{' '}
            {isChineseLocale(locale) ? '高' : 'High'}
          </span>
        )}
      </div>

      {/* 警报列表 */}
      <div className="space-y-1.5 max-h-[360px] overflow-auto">
        {sortedAlerts.map((alert) => (
          <div key={alert.id} className={`py-2.5 px-3 border ${getLevelStyle(alert.level)}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className="mt-0.5">{getLevelIcon(alert.level)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{alert.asset}</span>
                    <span className="px-1.5 py-0.5 bg-white/60 text-xs font-medium text-gray-600 flex items-center gap-1">
                      {getTypeIcon(alert.type)}
                      {getTypeLabel(alert.type)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-xs font-medium ${
                        alert.level === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : alert.level === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : alert.level === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {getLevelLabel(alert.level)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(alert.timestamp)}
                    </span>
                    <span>
                      {isChineseLocale(locale) ? '当前值:' : 'Current:'}{' '}
                      <span className="font-medium text-gray-700">{alert.value}</span>
                    </span>
                    <span>
                      {isChineseLocale(locale) ? '预期值:' : 'Expected:'}{' '}
                      <span className="font-medium text-gray-700">{alert.expectedValue}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => toggleExpand(alert.id)}
                  className="p-1 hover:bg-black/5 transition-colors"
                >
                  {expandedItems.has(alert.id) ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="p-1 hover:bg-black/5 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* 展开的详情 */}
            {expandedItems.has(alert.id) && (
              <div className="pt-2 mt-2 border-t border-black/5">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">
                      {isChineseLocale(locale) ? '异常ID:' : 'ID:'}
                    </span>
                    <span className="ml-1 font-mono text-gray-700">{alert.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">
                      {isChineseLocale(locale) ? '持续时间:' : 'Duration:'}
                    </span>
                    <span className="ml-1 text-gray-700">
                      {alert.duration
                        ? `${Math.floor(alert.duration / 60000)}${
                            isChineseLocale(locale) ? '分钟' : 'min'
                          }`
                        : isChineseLocale(locale)
                          ? '进行中'
                          : 'Ongoing'}
                    </span>
                  </div>
                  {alert.oracle && (
                    <div className="col-span-2">
                      <span className="text-gray-500">
                        {isChineseLocale(locale) ? '受影响预言机:' : 'Affected Oracle:'}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="px-1.5 py-0.5 bg-white/60 text-xs text-gray-700">
                          {alert.oracle}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
