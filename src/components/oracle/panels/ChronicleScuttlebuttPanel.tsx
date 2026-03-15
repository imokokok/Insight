'use client';

import { useI18n } from '@/lib/i18n/provider';
import { ScuttlebuttData } from '@/lib/oracles/chronicle';
import { Shield, CheckCircle, AlertTriangle, Info, Clock } from 'lucide-react';

interface ChronicleScuttlebuttPanelProps {
  data: ScuttlebuttData;
}

export function ChronicleScuttlebuttPanel({ data }: ChronicleScuttlebuttPanelProps) {
  const { t } = useI18n();

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700';
      case 'info':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold mb-3">{t('chronicle.scuttlebutt.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="py-2">
            <p className="text-xs text-gray-500 mb-1">{t('chronicle.scuttlebutt.securityLevel')}</p>
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium capitalize border ${getSecurityLevelColor(data.securityLevel)}`}>
              {data.securityLevel}
            </span>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-500 mb-1">{t('chronicle.scuttlebutt.auditScore')}</p>
            <p className="text-xl font-bold text-gray-900">{data.auditScore}/100</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${data.auditScore}%` }}
              />
            </div>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-500 mb-1">{t('chronicle.scuttlebutt.verificationStatus')}</p>
            <div className="flex items-center gap-2">
              {getVerificationStatusIcon(data.verificationStatus)}
              <span className="text-sm font-semibold text-gray-900 capitalize">{data.verificationStatus}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('chronicle.scuttlebutt.lastAudit')}: {formatDate(data.lastAuditTimestamp)}
            </p>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold mb-3">{t('chronicle.scuttlebutt.securityFeatures')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.securityFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 py-2"
            >
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Events */}
      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold mb-3">{t('chronicle.scuttlebutt.historicalEvents')}</h3>
        <div className="space-y-3">
          {data.historicalEvents.map((event, index) => (
            <div
              key={index}
              className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0"
            >
              <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${getSeverityColor(event.severity)}`}>
                {event.severity}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{event.event}</p>
                <p className="text-xs text-gray-500 mt-1">{formatDate(event.timestamp)}</p>
                {event.resolution && (
                  <p className="text-xs text-green-600 mt-1">{event.resolution}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
