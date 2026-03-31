'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

import { Bell, X, CheckCircle, AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';

import type { API3Alert } from '@/lib/oracles/api3';
import {
  formatAlertTime,
  getAlertSeverityColor,
  getAlertSeverityBgColor,
} from '@/lib/oracles/api3AlertDetection';
import { cn } from '@/lib/utils';

interface API3AlertBadgeProps {
  unreadCount: number;
  criticalCount: number;
  warningCount: number;
  alerts: API3Alert[];
  onMarkRead?: (id: string) => void;
  onResolve?: (id: string) => void;
  onViewAll?: () => void;
  compact?: boolean;
}

export function API3AlertBadge({
  unreadCount,
  criticalCount,
  warningCount,
  alerts,
  onMarkRead,
  onResolve,
  onViewAll,
  compact = false,
}: API3AlertBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasAlerts = unreadCount > 0;
  const isCritical = criticalCount > 0;

  const getBadgeColor = () => {
    if (criticalCount > 0) return 'bg-red-500';
    if (warningCount > 0) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
          'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          isOpen && 'bg-gray-100'
        )}
        aria-label={`告警 (${unreadCount} 条未读)`}
      >
        <div className="relative">
          <Bell
            className={cn(
              'w-5 h-5 transition-colors',
              hasAlerts ? (isCritical ? 'text-red-500' : 'text-yellow-500') : 'text-gray-400'
            )}
          />
          {hasAlerts && (
            <span
              className={cn(
                'absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center',
                'text-[10px] font-bold text-white rounded-full px-1',
                getBadgeColor()
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {!compact && (
          <span className="text-sm font-medium text-gray-700">
            {hasAlerts ? `${unreadCount} 条告警` : '无告警'}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute right-0 mt-2 w-80 sm:w-96 rounded-lg shadow-lg bg-white border border-gray-200',
            'z-50 animate-fade-in-down'
          )}
        >
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">告警通知</h3>
              {hasAlerts && (
                <div className="flex items-center gap-2 text-xs">
                  {criticalCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      {criticalCount} 严重
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="flex items-center gap-1 text-yellow-600">
                      <AlertTriangle className="w-3 h-3" />
                      {warningCount} 警告
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recentAlerts.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">暂无告警</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentAlerts.map((alert) => (
                  <AlertBadgeItem
                    key={alert.id}
                    alert={alert}
                    onMarkRead={onMarkRead}
                    onResolve={onResolve}
                    onClose={() => {}}
                  />
                ))}
              </div>
            )}
          </div>

          {alerts.length > 5 && (
            <div className="p-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onViewAll?.();
                }}
                className="w-full flex items-center justify-center gap-1 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                查看全部 {alerts.length} 条告警
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AlertBadgeItemProps {
  alert: API3Alert;
  onMarkRead?: (id: string) => void;
  onResolve?: (id: string) => void;
  onClose: () => void;
}

function AlertBadgeItem({ alert, onMarkRead, onResolve, onClose }: AlertBadgeItemProps) {
  const severityIcons = {
    info: <Info className="w-4 h-4 text-blue-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    critical: <AlertCircle className="w-4 h-4 text-red-500" />,
  };

  return (
    <div
      className={cn(
        'p-3 hover:bg-gray-50 transition-colors cursor-pointer',
        !alert.isRead && 'bg-blue-50/30'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{severityIcons[alert.severity]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'text-sm font-medium text-gray-900 truncate',
                !alert.isRead && 'font-semibold'
              )}
            >
              {alert.title}
            </p>
            {!alert.isRead && (
              <span
                className={cn(
                  'flex-shrink-0 w-2 h-2 rounded-full',
                  getAlertSeverityBgColor(alert.severity)
                )}
              />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{alert.message}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-gray-400">{formatAlertTime(alert.timestamp)}</span>
            <div className="flex items-center gap-2">
              {!alert.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead?.(alert.id);
                  }}
                  className="text-[10px] text-gray-500 hover:text-gray-700"
                >
                  标记已读
                </button>
              )}
              {!alert.isResolved && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve?.(alert.id);
                  }}
                  className="text-[10px] text-primary-600 hover:text-primary-700 font-medium"
                >
                  解决
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function API3AlertBadgeCompact({
  unreadCount,
  criticalCount,
  warningCount,
  onClick,
}: {
  unreadCount: number;
  criticalCount: number;
  warningCount: number;
  onClick?: () => void;
}) {
  const hasAlerts = unreadCount > 0;
  const isCritical = criticalCount > 0;

  const getBadgeColor = () => {
    if (criticalCount > 0) return 'bg-red-500';
    if (warningCount > 0) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label={`告警 (${unreadCount} 条未读)`}
    >
      <Bell
        className={cn(
          'w-5 h-5 transition-colors',
          hasAlerts ? (isCritical ? 'text-red-500' : 'text-yellow-500') : 'text-gray-400'
        )}
      />
      {hasAlerts && (
        <span
          className={cn(
            'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center',
            'text-[9px] font-bold text-white rounded-full px-1',
            getBadgeColor()
          )}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export function API3AlertStatusIndicator({
  criticalCount,
  warningCount,
}: {
  criticalCount: number;
  warningCount: number;
}) {
  if (criticalCount === 0 && warningCount === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200">
        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
        <span className="text-xs font-medium text-green-700">正常</span>
      </div>
    );
  }

  if (criticalCount > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 border border-red-200 animate-pulse">
        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
        <span className="text-xs font-medium text-red-700">{criticalCount} 严重告警</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-50 border border-yellow-200">
      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
      <span className="text-xs font-medium text-yellow-700">{warningCount} 警告</span>
    </div>
  );
}
