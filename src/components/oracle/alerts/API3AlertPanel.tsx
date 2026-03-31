'use client';

import { useState, useMemo, useCallback } from 'react';

import {
  Bell,
  Filter,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  ChevronDown,
  Check,
  X,
  RefreshCw,
  Settings,
  TrendingUp,
  Server,
  Shield,
  Lock,
} from 'lucide-react';

import type { API3Alert, AlertThreshold } from '@/lib/oracles/api3';
import {
  formatAlertTime,
  getAlertSeverityColor,
  getAlertSeverityBgColor,
} from '@/lib/oracles/api3AlertDetection';
import { cn } from '@/lib/utils';

type AlertFilterType =
  | 'all'
  | 'price_deviation'
  | 'node_offline'
  | 'coverage_pool_risk'
  | 'security_event';
type AlertFilterSeverity = 'all' | 'info' | 'warning' | 'critical';
type AlertFilterStatus = 'all' | 'unread' | 'resolved' | 'unresolved';

interface API3AlertPanelProps {
  alerts: API3Alert[];
  thresholds?: AlertThreshold[];
  onMarkRead?: (id: string) => void;
  onResolve?: (id: string) => void;
  onMarkAllRead?: () => void;
  onResolveAll?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const typeIcons: Record<API3Alert['type'], React.ReactNode> = {
  price_deviation: <TrendingUp className="w-4 h-4" />,
  node_offline: <Server className="w-4 h-4" />,
  coverage_pool_risk: <Shield className="w-4 h-4" />,
  security_event: <Lock className="w-4 h-4" />,
};

const typeLabels: Record<API3Alert['type'], string> = {
  price_deviation: '价格偏差',
  node_offline: '节点离线',
  coverage_pool_risk: '覆盖池风险',
  security_event: '安全事件',
};

const severityIcons = {
  info: <Info className="w-4 h-4 text-blue-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  critical: <AlertCircle className="w-4 h-4 text-red-500" />,
};

export function API3AlertPanel({
  alerts,
  thresholds = [],
  onMarkRead,
  onResolve,
  onMarkAllRead,
  onResolveAll,
  onRefresh,
  isLoading = false,
}: API3AlertPanelProps) {
  const [filterType, setFilterType] = useState<AlertFilterType>('all');
  const [filterSeverity, setFilterSeverity] = useState<AlertFilterSeverity>('all');
  const [filterStatus, setFilterStatus] = useState<AlertFilterStatus>('all');
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filterType !== 'all' && alert.type !== filterType) return false;
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
      if (filterStatus === 'unread' && alert.isRead) return false;
      if (filterStatus === 'resolved' && !alert.isResolved) return false;
      if (filterStatus === 'unresolved' && alert.isResolved) return false;
      return true;
    });
  }, [alerts, filterType, filterSeverity, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: alerts.length,
      unread: alerts.filter((a) => !a.isRead).length,
      critical: alerts.filter((a) => a.severity === 'critical' && !a.isResolved).length,
      warning: alerts.filter((a) => a.severity === 'warning' && !a.isResolved).length,
      info: alerts.filter((a) => a.severity === 'info' && !a.isResolved).length,
      resolved: alerts.filter((a) => a.isResolved).length,
    };
  }, [alerts]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedAlerts(new Set(filteredAlerts.map((a) => a.id)));
  }, [filteredAlerts]);

  const clearSelection = useCallback(() => {
    setSelectedAlerts(new Set());
  }, []);

  const handleBatchResolve = useCallback(() => {
    selectedAlerts.forEach((id) => {
      onResolve?.(id);
    });
    clearSelection();
  }, [selectedAlerts, onResolve, clearSelection]);

  const handleBatchMarkRead = useCallback(() => {
    selectedAlerts.forEach((id) => {
      onMarkRead?.(id);
    });
    clearSelection();
  }, [selectedAlerts, onMarkRead, clearSelection]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-50">
              <Bell className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">告警中心</h2>
              <p className="text-sm text-gray-500">
                共 {stats.total} 条告警，{stats.unread} 条未读
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
                showFilters
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              )}
            >
              <Filter className="w-4 h-4" />
              筛选
              <ChevronDown
                className={cn('w-3 h-3 transition-transform', showFilters && 'rotate-180')}
              />
            </button>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              刷新
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">告警类型</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as AlertFilterType)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">全部类型</option>
                  <option value="price_deviation">价格偏差</option>
                  <option value="node_offline">节点离线</option>
                  <option value="coverage_pool_risk">覆盖池风险</option>
                  <option value="security_event">安全事件</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">严重程度</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as AlertFilterSeverity)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">全部级别</option>
                  <option value="critical">严重</option>
                  <option value="warning">警告</option>
                  <option value="info">信息</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">状态</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as AlertFilterStatus)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">全部状态</option>
                  <option value="unread">未读</option>
                  <option value="unresolved">未解决</option>
                  <option value="resolved">已解决</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">统计:</span>
            {stats.critical > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                <AlertCircle className="w-3 h-3" />
                {stats.critical} 严重
              </span>
            )}
            {stats.warning > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                <AlertTriangle className="w-3 h-3" />
                {stats.warning} 警告
              </span>
            )}
            {stats.info > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                <Info className="w-3 h-3" />
                {stats.info} 信息
              </span>
            )}
            {stats.resolved > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <CheckCircle className="w-3 h-3" />
                {stats.resolved} 已解决
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {selectedAlerts.size > 0 && (
              <>
                <span className="text-xs text-gray-500">已选择 {selectedAlerts.size} 条</span>
                <button
                  onClick={handleBatchMarkRead}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  标记已读
                </button>
                <button
                  onClick={handleBatchResolve}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  批量解决
                </button>
                <button
                  onClick={clearSelection}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  取消选择
                </button>
              </>
            )}
            {selectedAlerts.size === 0 && stats.unread > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                全部标记已读
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">暂无符合条件的告警</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertPanelItem
              key={alert.id}
              alert={alert}
              isSelected={selectedAlerts.has(alert.id)}
              onToggleSelect={() => toggleSelect(alert.id)}
              onMarkRead={onMarkRead}
              onResolve={onResolve}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface AlertPanelItemProps {
  alert: API3Alert;
  isSelected: boolean;
  onToggleSelect: () => void;
  onMarkRead?: (id: string) => void;
  onResolve?: (id: string) => void;
}

function AlertPanelItem({
  alert,
  isSelected,
  onToggleSelect,
  onMarkRead,
  onResolve,
}: AlertPanelItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        'p-4 hover:bg-gray-50 transition-colors',
        !alert.isRead && 'bg-blue-50/30',
        isSelected && 'bg-primary-50/50'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggleSelect}
          className={cn(
            'flex-shrink-0 w-5 h-5 rounded border transition-colors mt-0.5',
            isSelected
              ? 'bg-primary-500 border-primary-500 text-white'
              : 'border-gray-300 hover:border-primary-400'
          )}
        >
          {isSelected && <Check className="w-3 h-3 mx-auto" />}
        </button>

        <div className="flex-shrink-0 mt-0.5">
          <div className={cn('p-1.5 rounded-lg', getAlertSeverityColor(alert.severity))}>
            {typeIcons[alert.type]}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4
                  className={cn(
                    'text-sm',
                    !alert.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                  )}
                >
                  {alert.title}
                </h4>
                <span
                  className={cn(
                    'flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full',
                    alert.severity === 'critical' && 'bg-red-100 text-red-700',
                    alert.severity === 'warning' && 'bg-yellow-100 text-yellow-700',
                    alert.severity === 'info' && 'bg-blue-100 text-blue-700'
                  )}
                >
                  {alert.severity === 'critical'
                    ? '严重'
                    : alert.severity === 'warning'
                      ? '警告'
                      : '信息'}
                </span>
                {alert.isResolved && (
                  <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-700">
                    已解决
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">{alert.message}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatAlertTime(alert.timestamp)}
              </span>
              <span className="flex items-center gap-1">
                {typeIcons[alert.type]}
                {typeLabels[alert.type]}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!alert.isRead && (
                <button
                  onClick={() => onMarkRead?.(alert.id)}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  标记已读
                </button>
              )}
              {!alert.isResolved && (
                <button
                  onClick={() => onResolve?.(alert.id)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  解决
                </button>
              )}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {isExpanded ? '收起' : '详情'}
              </button>
            </div>
          </div>

          {isExpanded && alert.metadata && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {alert.metadata.symbol && (
                  <div>
                    <span className="text-gray-500">交易对:</span>
                    <span className="ml-1 font-medium text-gray-900">{alert.metadata.symbol}</span>
                  </div>
                )}
                {alert.metadata.chain && (
                  <div>
                    <span className="text-gray-500">链:</span>
                    <span className="ml-1 font-medium text-gray-900">{alert.metadata.chain}</span>
                  </div>
                )}
                {alert.metadata.threshold !== undefined && (
                  <div>
                    <span className="text-gray-500">阈值:</span>
                    <span className="ml-1 font-medium text-gray-900">
                      {alert.metadata.threshold}%
                    </span>
                  </div>
                )}
                {alert.metadata.currentValue !== undefined && (
                  <div>
                    <span className="text-gray-500">当前值:</span>
                    <span className="ml-1 font-medium text-gray-900">
                      {alert.metadata.currentValue.toFixed(2)}%
                    </span>
                  </div>
                )}
                {alert.metadata.nodeId && (
                  <div>
                    <span className="text-gray-500">节点 ID:</span>
                    <span className="ml-1 font-medium text-gray-900 font-mono text-[10px]">
                      {alert.metadata.nodeId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function API3AlertThresholdSettings({
  thresholds,
  onUpdate,
}: {
  thresholds: AlertThreshold[];
  onUpdate?: (thresholds: AlertThreshold[]) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">告警阈值设置</h2>
            <p className="text-sm text-gray-500">配置告警触发条件</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {thresholds.map((threshold) => (
          <div key={threshold.type} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  threshold.enabled ? 'bg-green-500' : 'bg-gray-300'
                )}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{threshold.type}</p>
                {threshold.lastTriggered && (
                  <p className="text-xs text-gray-400">
                    上次触发: {formatAlertTime(threshold.lastTriggered)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">{threshold.threshold}</span>
              <button
                className={cn(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                  threshold.enabled ? 'bg-primary-500' : 'bg-gray-200'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    threshold.enabled ? 'translate-x-4' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
