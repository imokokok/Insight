'use client';

import { useState, useEffect, useCallback } from 'react';

import { X, AlertTriangle, AlertCircle, Info, CheckCircle, Bell } from 'lucide-react';

import type { API3Alert } from '@/lib/oracles/api3';
import { formatAlertTime, getAlertSeverityColor } from '@/lib/oracles/api3AlertDetection';
import { cn } from '@/lib/utils';

interface API3AlertNotificationProps {
  alert: API3Alert;
  onMarkRead?: (id: string) => void;
  onResolve?: (id: string) => void;
  onDismiss?: (id: string) => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const severityIcons = {
  info: <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  critical: <AlertCircle className="w-5 h-5 text-red-500" />,
};

const severityStyles = {
  info: {
    bg: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
    progress: 'bg-blue-500',
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    iconBg: 'bg-yellow-100',
    progress: 'bg-yellow-500',
  },
  critical: {
    bg: 'bg-red-50 border-red-200',
    iconBg: 'bg-red-100',
    progress: 'bg-red-500',
  },
};

export function API3AlertNotification({
  alert,
  onMarkRead,
  onResolve,
  onDismiss,
  autoClose = true,
  autoCloseDelay = 8000,
}: API3AlertNotificationProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss?.(alert.id);
    }, 300);
  }, [alert.id, onDismiss]);

  useEffect(() => {
    if (!autoClose || isPaused) return;

    const startTime = Date.now();
    const endTime = startTime + autoCloseDelay;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = endTime - now;
      const newProgress = (remaining / autoCloseDelay) * 100;

      if (newProgress <= 0) {
        clearInterval(interval);
        handleDismiss();
      } else {
        setProgress(newProgress);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [autoClose, autoCloseDelay, isPaused, handleDismiss]);

  const handleMarkRead = useCallback(() => {
    onMarkRead?.(alert.id);
  }, [alert.id, onMarkRead]);

  const handleResolve = useCallback(() => {
    onResolve?.(alert.id);
    handleDismiss();
  }, [alert.id, onResolve, handleDismiss]);

  const styles = severityStyles[alert.severity];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border shadow-lg transition-all duration-300',
        styles.bg,
        isExiting ? 'opacity-0 translate-x-4 scale-95' : 'opacity-100 translate-x-0 scale-100'
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('flex-shrink-0 p-2 rounded-full', styles.iconBg)}>
            {severityIcons[alert.severity]}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
                aria-label="关闭"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {alert.metadata && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {alert.metadata.symbol && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                    {alert.metadata.symbol}
                  </span>
                )}
                {alert.metadata.chain && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                    {alert.metadata.chain}
                  </span>
                )}
                {alert.metadata.currentValue !== undefined && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                    当前: {alert.metadata.currentValue.toFixed(2)}%
                  </span>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">{formatAlertTime(alert.timestamp)}</span>
              <div className="flex items-center gap-2">
                {!alert.isRead && (
                  <button
                    onClick={handleMarkRead}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    标记已读
                  </button>
                )}
                {!alert.isResolved && (
                  <button
                    onClick={handleResolve}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                  >
                    解决
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {autoClose && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50">
          <div
            className={cn('h-full transition-all duration-100', styles.progress)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface API3AlertNotificationContainerProps {
  alerts: API3Alert[];
  maxVisible?: number;
  onMarkRead?: (id: string) => void;
  onResolve?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function API3AlertNotificationContainer({
  alerts,
  maxVisible = 3,
  onMarkRead,
  onResolve,
  onDismiss,
}: API3AlertNotificationContainerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts
    .filter((a) => !dismissedIds.has(a.id) && !a.isResolved)
    .slice(0, maxVisible);

  const handleDismiss = useCallback(
    (id: string) => {
      setDismissedIds((prev) => new Set([...prev, id]));
      onDismiss?.(id);
    },
    [onDismiss]
  );

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {visibleAlerts.map((alert) => (
        <div key={alert.id} className="pointer-events-auto animate-slide-in-right">
          <API3AlertNotification
            alert={alert}
            onMarkRead={onMarkRead}
            onResolve={onResolve}
            onDismiss={handleDismiss}
          />
        </div>
      ))}
    </div>
  );
}

export function API3AlertToast({ alert, onClose }: { alert: API3Alert; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 max-w-sm w-full transition-all duration-300',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <div
        className={cn(
          'rounded-lg border shadow-lg p-4',
          getAlertSeverityColor(alert.severity)
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{alert.title}</p>
            <p className="text-xs mt-1 opacity-80">{formatAlertTime(alert.timestamp)}</p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
