'use client';

import React, { useState } from 'react';

import { X, Bell, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

import { useTranslations } from '@/i18n';

interface Alert {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: number;
}

interface API3AlertNotificationProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

export function API3AlertNotification({ alerts, onDismiss }: API3AlertNotificationProps) {
  const t = useTranslations();

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStyles = (type: Alert['type']) => {
    switch (type) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 p-4 border rounded-lg shadow-sm ${getStyles(alert.type)}`}
        >
          <div className="flex-shrink-0">{getIcon(alert.type)}</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
            {alert.message && <p className="text-sm text-gray-600 mt-1">{alert.message}</p>}
          </div>
          {onDismiss && (
            <button
              onClick={() => onDismiss(alert.id)}
              className="flex-shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

interface API3AlertNotificationContainerProps {
  children: React.ReactNode;
}

export function API3AlertNotificationContainer({ children }: API3AlertNotificationContainerProps) {
  return <div className="space-y-2">{children}</div>;
}

interface API3AlertToastProps {
  alert: Alert;
  onClose: () => void;
}

export function API3AlertToast({ alert, onClose }: API3AlertToastProps) {
  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
      {getIcon(alert.type)}
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
        {alert.message && <p className="text-sm text-gray-600">{alert.message}</p>}
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}