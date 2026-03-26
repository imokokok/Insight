'use client';

import { useTranslations } from '@/i18n';
import { getEventTypeColor, getStatusColor } from '@/lib/utils/riskUtils';
import type { RiskEvent } from '@/types/risk';

import { DashboardCard } from './DashboardCard';

export interface SecurityTimelineProps {
  events: RiskEvent[];
  className?: string;
  maxItems?: number;
}

export function SecurityTimeline({ events, className = '', maxItems }: SecurityTimelineProps) {
  const t = useTranslations();

  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  const getEventTypeLabel = (type: RiskEvent['type']) => {
    switch (type) {
      case 'upgrade':
        return t('oracleCommon.securityTimeline.types.upgrade');
      case 'vulnerability':
        return t('oracleCommon.securityTimeline.types.vulnerability');
      case 'response':
        return t('oracleCommon.securityTimeline.types.response');
      case 'maintenance':
        return t('oracleCommon.securityTimeline.types.maintenance');
      default:
        return type;
    }
  };

  const getStatusLabel = (status: RiskEvent['status']) => {
    switch (status) {
      case 'resolved':
        return t('oracleCommon.securityTimeline.status.resolved');
      case 'monitoring':
        return t('oracleCommon.securityTimeline.status.monitoring');
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEventIcon = (type: RiskEvent['type']) => {
    switch (type) {
      case 'upgrade':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        );
      case 'vulnerability':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case 'response':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'maintenance':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardCard title={t('oracleCommon.securityTimeline.title')} className={className}>
      <div className="space-y-4">
        {displayEvents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            {t('oracleCommon.securityTimeline.noEvents')}
          </p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-4">
              {displayEvents.map((event, index) => (
                <div key={index} className="relative pl-10">
                  <div
                    className={`absolute left-2 top-1 w-5 h-5 -translate-x-1/2 flex items-center justify-center ${getEventTypeColor(event.type)}`}
                  >
                    {getEventIcon(event.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">{formatDate(event.date)}</span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium ${getEventTypeColor(event.type)}`}
                      >
                        {getEventTypeLabel(event.type)}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium ${getStatusColor(event.status)}`}
                      >
                        {getStatusLabel(event.status)}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-600">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}

export default SecurityTimeline;
