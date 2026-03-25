'use client';

import { useTranslations } from '@/i18n';
import { ChronicleScuttlebuttViewProps } from '../types';
import { ChronicleDataTable } from './ChronicleDataTable';
import { Shield, CheckCircle, Clock, AlertTriangle, Info } from 'lucide-react';

interface HistoricalEvent {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  event: string;
  timestamp: number;
  resolution?: string;
}

const mockEvents: HistoricalEvent[] = [
  {
    id: '1',
    severity: 'info',
    event: 'Routine security audit completed',
    timestamp: Date.now() - 86400000 * 7,
    resolution: 'All systems passed',
  },
  {
    id: '2',
    severity: 'warning',
    event: 'Validator response time degradation detected',
    timestamp: Date.now() - 86400000 * 15,
    resolution: 'Auto-failover activated, resolved within 5 minutes',
  },
  {
    id: '3',
    severity: 'info',
    event: 'New validator node added to network',
    timestamp: Date.now() - 86400000 * 30,
  },
  {
    id: '4',
    severity: 'critical',
    event: 'Price feed deviation threshold exceeded',
    timestamp: Date.now() - 86400000 * 45,
    resolution: 'Manual review completed, no action required',
  },
  {
    id: '5',
    severity: 'info',
    event: 'Scuttlebutt protocol upgrade v2.1',
    timestamp: Date.now() - 86400000 * 60,
  },
];

export function ChronicleScuttlebuttView({
  scuttlebutt,
  isLoading,
}: ChronicleScuttlebuttViewProps) {
  const t = useTranslations();

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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const securityFeatures = [
    'Decentralized Consensus',
    'Cryptographic Verification',
    'Economic Security Model',
    'Real-time Monitoring',
    'Multi-sig Authorization',
    'Automated Failover',
  ];

  const columns = [
    {
      key: 'severity',
      header: t('chronicle.scuttlebutt.severity'),
      sortable: true,
      render: (item: HistoricalEvent) => (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(item.severity)}`}>
          {getSeverityIcon(item.severity)}
          <span className="capitalize">{item.severity}</span>
        </span>
      ),
    },
    {
      key: 'event',
      header: t('chronicle.scuttlebutt.event'),
      sortable: true,
      render: (item: HistoricalEvent) => (
        <div>
          <p className="font-medium text-gray-900">{item.event}</p>
          {item.resolution && (
            <p className="text-xs text-emerald-600 mt-0.5">{item.resolution}</p>
          )}
        </div>
      ),
    },
    {
      key: 'timestamp',
      header: t('chronicle.scuttlebutt.date'),
      sortable: true,
      render: (item: HistoricalEvent) => formatDate(item.timestamp),
    },
  ];

  const auditScore = scuttlebutt?.auditScore ?? 98;
  const securityLevel = scuttlebutt?.securityLevel ?? 'high';
  const verificationStatus = scuttlebutt?.verificationStatus ?? 'verified';

  return (
    <div className="space-y-8">
      {/* 安全概览 - 3列简洁布局 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${securityLevel === 'high' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <Shield className={`w-6 h-6 ${securityLevel === 'high' ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('chronicle.scuttlebutt.securityLevel')}</p>
            <p className="text-xl font-semibold text-gray-900 capitalize">{securityLevel}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <CheckCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('chronicle.scuttlebutt.auditScore')}</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-semibold text-gray-900">{auditScore}</p>
              <span className="text-sm text-gray-400">/100</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${verificationStatus === 'verified' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <Clock className={`w-6 h-6 ${verificationStatus === 'verified' ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('chronicle.scuttlebutt.verificationStatus')}</p>
            <p className="text-xl font-semibold text-gray-900 capitalize">{verificationStatus}</p>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 安全特性 - 紧凑网格布局 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('chronicle.scuttlebutt.securityFeatures')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {securityFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-3 py-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 历史事件表格 */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          {t('chronicle.scuttlebutt.historicalEvents')}
        </h3>
        <ChronicleDataTable
          data={mockEvents as unknown as Record<string, unknown>[]}
          columns={columns as unknown as Array<{key: string; header: string; width?: string; sortable?: boolean; render?: (item: Record<string, unknown>) => React.ReactNode}>}
        />
      </div>
    </div>
  );
}
