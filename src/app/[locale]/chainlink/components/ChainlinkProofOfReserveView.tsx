'use client';

import { useState, useRef } from 'react';

import {
  Shield,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  Building2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';

interface PoRStats {
  monitoredAssets: number;
  totalAttestedValue: number;
  auditFrequency: string;
  integratedProtocols: number;
}

interface ReserveAsset {
  name: string;
  onChainAmount: number;
  offChainReserve: number;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdate: Date;
  coverage: number;
}

interface AuditLog {
  id: string;
  auditor: string;
  timestamp: Date;
  findings: string[];
  status: 'passed' | 'issues_found';
}

interface CoverageTrend {
  date: string;
  coverage: number;
  deviation: number;
}

const porStats: PoRStats = {
  monitoredAssets: 24,
  totalAttestedValue: 28500000000,
  auditFrequency: 'Daily',
  integratedProtocols: 156,
};

const REFERENCE_TIME = Date.now();

const reserveAssets: ReserveAsset[] = [
  {
    name: 'USDT Reserves',
    onChainAmount: 83200000000,
    offChainReserve: 83500000000,
    status: 'healthy',
    lastUpdate: new Date(REFERENCE_TIME - 1000 * 60 * 15),
    coverage: 100.36,
  },
  {
    name: 'USDC Reserves',
    onChainAmount: 28500000000,
    offChainReserve: 28520000000,
    status: 'healthy',
    lastUpdate: new Date(REFERENCE_TIME - 1000 * 60 * 8),
    coverage: 100.07,
  },
  {
    name: 'WBTC Reserves',
    onChainAmount: 158000000000,
    offChainReserve: 157500000000,
    status: 'warning',
    lastUpdate: new Date(REFERENCE_TIME - 1000 * 60 * 45),
    coverage: 99.68,
  },
  {
    name: 'ETH Staking Pool',
    onChainAmount: 4200000000,
    offChainReserve: 4180000000,
    status: 'warning',
    lastUpdate: new Date(REFERENCE_TIME - 1000 * 60 * 30),
    coverage: 99.52,
  },
  {
    name: 'DAI Reserves',
    onChainAmount: 5300000000,
    offChainReserve: 5305000000,
    status: 'healthy',
    lastUpdate: new Date(REFERENCE_TIME - 1000 * 60 * 5),
    coverage: 100.09,
  },
  {
    name: 'LUSD Reserves',
    onChainAmount: 245000000,
    offChainReserve: 246000000,
    status: 'healthy',
    lastUpdate: new Date(REFERENCE_TIME - 1000 * 60 * 12),
    coverage: 100.41,
  },
];

const auditLogs: AuditLog[] = [
  {
    id: 'audit-001',
    auditor: 'ChainSecurity',
    timestamp: new Date(REFERENCE_TIME - 1000 * 60 * 60 * 24 * 2),
    findings: [],
    status: 'passed',
  },
  {
    id: 'audit-002',
    auditor: 'OpenZeppelin',
    timestamp: new Date(REFERENCE_TIME - 1000 * 60 * 60 * 24 * 7),
    findings: [
      'Minor discrepancy in WBTC reserve calculation',
      'Recommended update to oracle timeout',
    ],
    status: 'issues_found',
  },
  {
    id: 'audit-003',
    auditor: 'Trail of Bits',
    timestamp: new Date(REFERENCE_TIME - 1000 * 60 * 60 * 24 * 14),
    findings: [],
    status: 'passed',
  },
  {
    id: 'audit-004',
    auditor: 'CertiK',
    timestamp: new Date(REFERENCE_TIME - 1000 * 60 * 60 * 24 * 21),
    findings: ['Gas optimization opportunity in reserve verification'],
    status: 'issues_found',
  },
  {
    id: 'audit-005',
    auditor: 'Quantstamp',
    timestamp: new Date(REFERENCE_TIME - 1000 * 60 * 60 * 24 * 30),
    findings: [],
    status: 'passed',
  },
];

const coverageTrendData: CoverageTrend[] = [
  { date: '2024-01', coverage: 100.2, deviation: 0.2 },
  { date: '2024-02', coverage: 100.1, deviation: 0.1 },
  { date: '2024-03', coverage: 99.8, deviation: -0.2 },
  { date: '2024-04', coverage: 100.0, deviation: 0.0 },
  { date: '2024-05', coverage: 100.3, deviation: 0.3 },
  { date: '2024-06', coverage: 99.9, deviation: -0.1 },
  { date: '2024-07', coverage: 100.1, deviation: 0.1 },
  { date: '2024-08', coverage: 100.0, deviation: 0.0 },
  { date: '2024-09', coverage: 99.7, deviation: -0.3 },
  { date: '2024-10', coverage: 100.2, deviation: 0.2 },
  { date: '2024-11', coverage: 100.1, deviation: 0.1 },
  { date: '2024-12', coverage: 100.0, deviation: 0.0 },
];

export function ChainlinkProofOfReserveView() {
  const t = useTranslations();
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

  const formatValue = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-emerald-600 bg-emerald-50';
      case 'warning':
        return 'text-amber-600 bg-amber-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 100) return 'text-emerald-600';
    if (coverage >= 99.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((REFERENCE_TIME - date.getTime()) / (1000 * 60));
    if (minutes < 60) return t('chainlink.por.timeAgo.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('chainlink.por.timeAgo.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('chainlink.por.timeAgo.daysAgo', { count: days });
  };

  const avgCoverage =
    reserveAssets.reduce((sum, asset) => sum + asset.coverage, 0) / reserveAssets.length;
  const healthyCount = reserveAssets.filter((a) => a.status === 'healthy').length;
  const warningCount = reserveAssets.filter((a) => a.status === 'warning').length;

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{t('chainlink.por.overview')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('chainlink.por.overviewDesc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">{t('chainlink.por.monitoredAssets')}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{porStats.monitoredAssets}</div>
            <div className="text-sm text-gray-400 mt-1">{t('chainlink.por.activeFeeds')}</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm text-gray-500">{t('chainlink.por.totalAttestedValue')}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {formatValue(porStats.totalAttestedValue)}
            </div>
            <div className="text-sm text-gray-400 mt-1">{t('chainlink.por.acrossProtocols')}</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">{t('chainlink.por.auditFrequency')}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{porStats.auditFrequency}</div>
            <div className="text-sm text-gray-400 mt-1">{t('chainlink.por.automatedChecks')}</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-sm text-gray-500">
                {t('chainlink.por.integratedProtocols')}
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{porStats.integratedProtocols}</div>
            <div className="text-sm text-gray-400 mt-1">{t('chainlink.por.defiProtocols')}</div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('chainlink.por.reserveAssets')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('chainlink.por.reserveAssetsDesc')}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    {t('chainlink.por.assetName')}
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    {t('chainlink.por.onChainAmount')}
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    {t('chainlink.por.offChainReserve')}
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    {t('chainlink.por.coverage')}
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    {t('chainlink.por.status')}
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    {t('chainlink.por.lastUpdate')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reserveAssets.map((asset, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="font-medium text-gray-900">{asset.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-gray-900 font-medium">
                        {formatValue(asset.onChainAmount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-gray-900 font-medium">
                        {formatValue(asset.offChainReserve)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-medium ${getCoverageColor(asset.coverage)}`}>
                          {asset.coverage.toFixed(2)}%
                        </span>
                        {asset.coverage >= 100 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}
                        >
                          {getStatusIcon(asset.status)}
                          <span className="capitalize">{asset.status}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm text-gray-500">
                        {formatTimeAgo(asset.lastUpdate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('chainlink.por.healthMetrics')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('chainlink.por.healthMetricsDesc')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              {t('chainlink.por.coverageTrend')}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={coverageTrendData}>
                  <defs>
                    <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={chartColors.oracle.chainlink}
                        stopOpacity={0.2}
                      />
                      <stop offset="95%" stopColor={chartColors.oracle.chainlink} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    domain={[99, 101]}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                    formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Coverage']}
                  />
                  <Area
                    type="monotone"
                    dataKey="coverage"
                    stroke={chartColors.oracle.chainlink}
                    strokeWidth={2}
                    fill="url(#coverageGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey={100}
                    stroke="#9ca3af"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                {t('chainlink.por.healthSummary')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('chainlink.por.avgCoverage')}</span>
                  <span className={`font-semibold ${getCoverageColor(avgCoverage)}`}>
                    {avgCoverage.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('chainlink.por.healthyAssets')}</span>
                  <span className="font-semibold text-emerald-600">{healthyCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('chainlink.por.warningAssets')}</span>
                  <span className="font-semibold text-amber-600">{warningCount}</span>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {t('chainlink.por.overallStatus')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t('chainlink.por.healthy')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                {t('chainlink.por.deviationAlerts')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {t('chainlink.por.wbtcDeviation')}
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">-0.32% from target</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {t('chainlink.por.ethDeviation')}
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">-0.48% from target</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{t('chainlink.por.auditLog')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('chainlink.por.auditLogDesc')}</p>
        </div>

        <div className="space-y-3">
          {auditLogs.map((audit) => (
            <div
              key={audit.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setExpandedAudit(expandedAudit === audit.id ? null : audit.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${audit.status === 'passed' ? 'bg-emerald-50' : 'bg-amber-50'}`}
                  >
                    {audit.status === 'passed' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{audit.auditor}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${audit.status === 'passed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}
                      >
                        {audit.status === 'passed'
                          ? t('chainlink.por.passed')
                          : t('chainlink.por.issuesFound')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {audit.timestamp.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {audit.findings.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {audit.findings.length}{' '}
                      {audit.findings.length === 1
                        ? t('chainlink.por.finding')
                        : t('chainlink.por.findings')}
                    </span>
                  )}
                  {expandedAudit === audit.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
              {expandedAudit === audit.id && audit.findings.length > 0 && (
                <div className="px-5 pb-4 pt-0">
                  <div className="ml-14 space-y-2">
                    {audit.findings.map((finding, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                        <span>{finding}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section className="flex items-start gap-4 py-2">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('chainlink.por.about')}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {t('chainlink.por.aboutDesc') ||
              'Chainlink Proof of Reserve provides real-time, transparent verification of off-chain and cross-chain reserves. It enables automated auditing and helps ensure that on-chain assets are fully backed by real-world collateral.'}
          </p>
        </div>
      </section>
    </div>
  );
}
