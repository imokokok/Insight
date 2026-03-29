'use client';

import { useState, useMemo } from 'react';

import {
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Bell,
  CheckCircle2,
  Info,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type AnomalyData } from '../types';

interface AnomalyModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AnomalyData[];
  loading?: boolean;
  onAcknowledge?: (id: string) => void;
  onAcknowledgeAll?: () => void;
}

type FilterLevel = 'all' | 'critical' | 'high' | 'medium' | 'low';
type FilterType = 'all' | 'price_spike' | 'price_drop' | 'volatility_spike' | 'trend_break';
type SortBy = 'time' | 'level' | 'asset';

export default function AnomalyModal({
  isOpen,
  onClose,
  data,
  loading = false,
  onAcknowledge,
  onAcknowledgeAll,
}: AnomalyModalProps) {
  const t = useTranslations('marketOverview.anomalyModal');
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('time');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [acknowledgedItems, setAcknowledgedItems] = useState<Set<string>>(new Set());

  // 过滤和排序数据
  const filteredData = useMemo(() => {
    let result = [...(data || [])];

    // 过滤已确认的
    result = result.filter((item) => !acknowledgedItems.has(item.id));

    // 按级别过滤
    if (filterLevel !== 'all') {
      result = result.filter((item) => item.level === filterLevel);
    }

    // 按类型过滤
    if (filterType !== 'all') {
      result = result.filter((item) => item.type === filterType);
    }

    // 排序
    switch (sortBy) {
      case 'time':
        result.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'level':
        const levelOrder: Record<string, number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        result.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
        break;
      case 'asset':
        result.sort((a, b) => a.asset.localeCompare(b.asset));
        break;
    }

    return result;
  }, [data, filterLevel, filterType, sortBy, acknowledgedItems]);

  // 统计信息
  const stats = useMemo(() => {
    const activeData = (data || []).filter((item) => !acknowledgedItems.has(item.id));
    return {
      total: activeData.length,
      critical: activeData.filter((item) => item.level === 'critical').length,
      high: activeData.filter((item) => item.level === 'high').length,
      medium: activeData.filter((item) => item.level === 'medium').length,
      low: activeData.filter((item) => item.level === 'low').length,
    };
  }, [data, acknowledgedItems]);

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

  // 确认单个异常
  const acknowledgeItem = (id: string) => {
    setAcknowledgedItems(new Set(acknowledgedItems).add(id));
    onAcknowledge?.(id);
  };

  // 确认全部
  const acknowledgeAll = () => {
    const newAcknowledged = new Set(acknowledgedItems);
    filteredData.forEach((item) => newAcknowledged.add(item.id));
    setAcknowledgedItems(newAcknowledged);
    onAcknowledgeAll?.();
  };

  // 获取严重程度样式
  const getLevelStyle = (level: AnomalyData['level']) => {
    switch (level) {
      case 'critical':
        return 'bg-danger-50 border-l-4 border-danger-500';
      case 'high':
        return 'bg-warning-50 border-l-4 border-orange-500';
      case 'medium':
        return 'bg-warning-50 border-l-4 border-warning-500';
      case 'low':
        return 'bg-primary-50 border-l-4 border-primary-500';
      default:
        return 'bg-gray-50 border-l-4 border-gray-500';
    }
  };

  // 获取严重程度图标
  const getLevelIcon = (level: AnomalyData['level']) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-danger-500" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-warning-500" />;
      case 'medium':
        return <Bell className="w-5 h-5 text-warning-500" />;
      case 'low':
        return <Info className="w-5 h-5 text-primary-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  // 获取严重程度标签
  const getLevelLabel = (level: AnomalyData['level']) => {
    const labels: Record<AnomalyData['level'], string> = {
      critical: t('critical'),
      high: t('high'),
      medium: t('medium'),
      low: t('low'),
    };
    return labels[level];
  };

  // 获取类型图标
  const getTypeIcon = (type: AnomalyData['type']) => {
    switch (type) {
      case 'price_spike':
        return <TrendingUp className="w-4 h-4" />;
      case 'price_drop':
        return <TrendingDown className="w-4 h-4" />;
      case 'volatility_spike':
        return <Activity className="w-4 h-4" />;
      case 'trend_break':
        return <TrendingDown className="w-4 h-4" />;
      case 'volume_anomaly':
        return <Activity className="w-4 h-4" />;
      case 'correlation_break':
        return <Activity className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // 获取类型标签
  const getTypeLabel = (type: AnomalyData['type']) => {
    const labels: Record<AnomalyData['type'], string> = {
      price_spike: t('priceSpike'),
      price_drop: t('priceDrop'),
      volatility_spike: t('volatilitySpike'),
      trend_break: t('trendBreak'),
      volume_anomaly: t('volumeAnomaly'),
      correlation_break: t('correlationBreak'),
    };
    return labels[type];
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return t('minutesAgo', { minutes });
    }
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return t('hoursAgo', { hours });
    }
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化持续时间
  const formatDuration = (duration?: number) => {
    if (!duration) return t('ongoing');
    const minutes = Math.floor(duration / 60000);
    if (minutes < 60) return t('minutes', { minutes });
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return t('hours', { hours });
    return t('hoursMinutes', { hours, minutes: remainingMinutes });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-100 border border-warning-200">
              <AlertTriangle className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('title')}</h2>
              <p className="text-sm text-gray-500">{t('subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{t('total')}:</span>
              <span className="font-semibold text-gray-900">{stats.total}</span>
            </div>
            {stats.critical > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-danger-500" />
                <span className="text-danger-600 font-medium">{stats.critical} {t('critical')}</span>
              </div>
            )}
            {stats.high > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500" />
                <span className="text-orange-600 font-medium">{stats.high} {t('high')}</span>
              </div>
            )}
            {stats.medium > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-warning-500" />
                <span className="text-warning-600 font-medium">{stats.medium} {t('medium')}</span>
              </div>
            )}
            {stats.low > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500" />
                <span className="text-primary-600 font-medium">{stats.low} {t('low')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{t('filters')}:</span>
            </div>

            {/* Level Filter */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as FilterLevel)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">{t('allLevels')}</option>
              <option value="critical">{t('critical')}</option>
              <option value="high">{t('high')}</option>
              <option value="medium">{t('medium')}</option>
              <option value="low">{t('low')}</option>
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">{t('allTypes')}</option>
              <option value="price_spike">{t('priceSpike')}</option>
              <option value="price_drop">{t('priceDrop')}</option>
              <option value="volatility_spike">{t('volatilitySpike')}</option>
              <option value="trend_break">{t('trendBreak')}</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="time">{t('sortByTime')}</option>
              <option value="level">{t('sortByLevel')}</option>
              <option value="asset">{t('sortByAsset')}</option>
            </select>

            <div className="flex-1" />

            {/* Acknowledge All */}
            {filteredData.length > 0 && (
              <button
                onClick={acknowledgeAll}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t('acknowledgeAll')}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent animate-spin" />
                <span className="text-gray-500">{t('loading')}</span>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-success-100 border border-green-200 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-success-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">{t('noAnomalies')}</h3>
              <p className="text-gray-500">{t('allNormal')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`p-4 border ${getLevelStyle(anomaly.level)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5">{getLevelIcon(anomaly.level)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <span className="font-semibold text-gray-900">{anomaly.asset}</span>
                          <span className="px-2 py-0.5 bg-white/60 text-sm font-medium text-gray-600 flex items-center gap-1.5">
                            {getTypeIcon(anomaly.type)}
                            {getTypeLabel(anomaly.type)}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-sm font-medium ${
                              anomaly.level === 'critical'
                                ? 'bg-danger-100 text-danger-700'
                                : anomaly.level === 'high'
                                  ? 'bg-warning-100 text-orange-700'
                                  : anomaly.level === 'medium'
                                    ? 'bg-warning-100 text-warning-700'
                                    : 'bg-primary-100 text-primary-700'
                            }`}
                          >
                            {getLevelLabel(anomaly.level)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{anomaly.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {formatTime(anomaly.timestamp)}
                          </span>
                          <span>
                            {t('currentValue')}:{' '}
                            <span className="font-medium text-gray-700">{anomaly.value}</span>
                          </span>
                          <span>
                            {t('expectedValue')}:{' '}
                            <span className="font-medium text-gray-700">{anomaly.expectedValue}</span>
                          </span>
                          <span>
                            {t('duration')}:{' '}
                            <span className="font-medium text-gray-700">
                              {formatDuration(anomaly.duration)}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleExpand(anomaly.id)}
                        className="p-2 hover:bg-black/5 transition-colors"
                      >
                        {expandedItems.has(anomaly.id) ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => acknowledgeItem(anomaly.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {t('acknowledge')}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedItems.has(anomaly.id) && (
                    <div className="pt-4 mt-4 border-t border-black/5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 block mb-1">{t('anomalyId')}</span>
                          <span className="font-mono text-gray-700">{anomaly.id}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-1">{t('detectionTime')}</span>
                          <span className="text-gray-700">
                            {new Date(anomaly.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-1">{t('deviation')}</span>
                          <span
                            className={`font-medium ${
                              (anomaly.deviation || 0) > 0 ? 'text-danger-600' : 'text-success-600'
                            }`}
                          >
                            {(anomaly.deviation || 0) > 0 ? '+' : ''}
                            {anomaly.deviation?.toFixed(2)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-1">{t('confidence')}</span>
                          <span className="text-gray-700">{anomaly.confidence || 0}%</span>
                        </div>
                      </div>
                      {anomaly.oracle && (
                        <div className="mt-4">
                          <span className="text-gray-500 block mb-2 text-sm">{t('affectedOracle')}</span>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-white/60 text-sm text-gray-700">
                              {anomaly.oracle}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {t('showing', { count: filteredData.length, total: stats.total })}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
