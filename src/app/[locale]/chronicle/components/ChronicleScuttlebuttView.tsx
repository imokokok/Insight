'use client';

import { useTranslations } from 'next-intl';
import { ChronicleScuttlebuttViewProps } from '../types';

export function ChronicleScuttlebuttView({
  scuttlebutt,
  isLoading,
}: ChronicleScuttlebuttViewProps) {
  const t = useTranslations();

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const securityFeatures = scuttlebutt?.securityFeatures || [
    'Decentralized Consensus',
    'Cryptographic Verification',
    'Economic Security Model',
    'Real-time Monitoring',
    'Multi-sig Authorization',
    'Automated Failover',
  ];

  const historicalEvents = scuttlebutt?.historicalEvents || [];

  return (
    <div className="space-y-4">
      {/* Security Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('chronicle.scuttlebutt.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="py-2">
            <p className="text-xs text-gray-500 mb-1">{t('chronicle.scuttlebutt.securityLevel')}</p>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium capitalize border ${getSecurityLevelColor(scuttlebutt?.securityLevel || 'high')}`}
            >
              {t(`chronicle.securityLevel.${scuttlebutt?.securityLevel || 'high'}`)}
            </span>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-500 mb-1">{t('chronicle.scuttlebutt.auditScore')}</p>
            <p className="text-xl font-bold text-gray-900">{scuttlebutt?.auditScore || 98}/100</p>
            <div className="mt-2 w-full bg-gray-200 h-2 rounded-full">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${scuttlebutt?.auditScore || 98}%` }}
              />
            </div>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-500 mb-1">
              {t('chronicle.scuttlebutt.verificationStatus')}
            </p>
            <div className="flex items-center gap-2">
              {getVerificationStatusIcon(scuttlebutt?.verificationStatus || 'verified')}
              <span className="text-sm font-semibold text-gray-900 capitalize">
                {t(`chronicle.verificationStatus.${scuttlebutt?.verificationStatus || 'verified'}`)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('chronicle.scuttlebutt.lastAudit')}: {formatDate(scuttlebutt?.lastAuditTimestamp || Date.now() - 86400000 * 7)}
            </p>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('chronicle.scuttlebutt.securityFeatures')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {securityFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-3 py-2">
              <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Events */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('chronicle.scuttlebutt.historicalEvents')}</h3>
        <div className="space-y-3">
          {historicalEvents.map((event, index) => (
            <div
              key={index}
              className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0"
            >
              <span
                className={`px-2 py-1 text-xs font-medium capitalize border rounded ${getSeverityColor(event.severity)}`}
              >
                {t(`chronicle.severity.${event.severity}`)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{event.event}</p>
                <p className="text-xs text-gray-500 mt-1">{formatDate(event.timestamp)}</p>
                {event.resolution && (
                  <p className="text-xs text-emerald-600 mt-1">{event.resolution}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
