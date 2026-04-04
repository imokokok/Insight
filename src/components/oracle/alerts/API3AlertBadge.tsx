'use client';

import React from 'react';

import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

import { useTranslations } from '@/i18n';

interface API3AlertBadgeCompactProps {
  unreadCount?: number;
  criticalCount?: number;
  warningCount?: number;
  onClick?: () => void;
}

export function API3AlertBadge({
  unreadCount,
  criticalCount,
  warningCount,
  onClick,
}: API3AlertBadgeCompactProps) {
  const t = useTranslations();

  const hasAlerts = (criticalCount || 0) > 0 || (warningCount || 0) > 0;

  const getStatusStyles = () => {
    if ((criticalCount || 0) > 0) {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if ((warningCount || 0) > 0) {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const getIcon = () => {
    if ((criticalCount || 0) > 0) {
      return <AlertCircle className="w-3 h-3" />;
    }
    if ((warningCount || 0) > 0) {
      return <AlertTriangle className="w-3 h-3" />;
    }
    return <CheckCircle className="w-3 h-3" />;
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusStyles()}`}
    >
      {getIcon()}
      {unreadCount !== undefined && <span>{unreadCount}</span>}
      {(criticalCount !== undefined || warningCount !== undefined) && (
        <span className="ml-1">
          {criticalCount || 0}/{warningCount || 0}
        </span>
      )}
    </button>
  );
}

interface API3AlertStatusIndicatorProps {
  criticalCount?: number;
  warningCount?: number;
  label?: string;
}

export function API3AlertStatusIndicator({
  criticalCount,
  warningCount,
  label,
}: API3AlertStatusIndicatorProps) {
  const t = useTranslations();

  const hasAlerts = (criticalCount || 0) > 0 || (warningCount || 0) > 0;

  const getStatusConfig = () => {
    if ((criticalCount || 0) > 0) {
      return {
        color: 'bg-red-500',
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
        text: label || t('api3.status.critical'),
      };
    }
    if ((warningCount || 0) > 0) {
      return {
        color: 'bg-amber-500',
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        text: label || t('api3.status.warning'),
      };
    }
    return {
      color: 'bg-emerald-500',
      icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
      text: label || t('api3.status.normal'),
    };
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {hasAlerts && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.color}`} />
      </span>
      {config.text}
    </div>
  );
}
