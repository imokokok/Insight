'use client';

import { useState } from 'react';

import {
  Shield,
  Lock,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  Coins,
  BarChart3,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';

import { type RedStoneAVSViewProps } from '../types';

const aprTrendData = [
  { date: '2024-01', apr: 8.2 },
  { date: '2024-02', apr: 8.5 },
  { date: '2024-03', apr: 8.8 },
  { date: '2024-04', apr: 9.1 },
  { date: '2024-05', apr: 9.4 },
  { date: '2024-06', apr: 9.2 },
  { date: '2024-07', apr: 9.6 },
  { date: '2024-08', apr: 9.8 },
  { date: '2024-09', apr: 10.1 },
  { date: '2024-10', apr: 10.3 },
  { date: '2024-11', apr: 10.5 },
  { date: '2024-12', apr: 10.8 },
];

const stakeDistributionData = [
  { range: '0-100 ETH', operators: 45, percentage: 30 },
  { range: '100-500 ETH', operators: 62, percentage: 41 },
  { range: '500-1000 ETH', operators: 28, percentage: 19 },
  { range: '1000+ ETH', operators: 15, percentage: 10 },
];

const nodeOperators = [
  {
    id: 'op-001',
    name: 'EigenNode Alpha',
    stake: 2450.5,
    performance: 99.8,
    uptime: 99.95,
    status: 'active',
    delegators: 156,
    apr: 10.5,
  },
  {
    id: 'op-002',
    name: 'RedStone Validator',
    stake: 1820.3,
    performance: 99.6,
    uptime: 99.92,
    status: 'active',
    delegators: 98,
    apr: 10.3,
  },
  {
    id: 'op-003',
    name: 'SecureStake Labs',
    stake: 1560.8,
    performance: 99.9,
    uptime: 99.98,
    status: 'active',
    delegators: 234,
    apr: 10.8,
  },
  {
    id: 'op-004',
    name: 'CryptoNode Pro',
    stake: 980.2,
    performance: 99.4,
    uptime: 99.85,
    status: 'active',
    delegators: 67,
    apr: 10.1,
  },
  {
    id: 'op-005',
    name: 'TrustValidator',
    stake: 756.4,
    performance: 99.7,
    uptime: 99.9,
    status: 'active',
    delegators: 89,
    apr: 10.4,
  },
  {
    id: 'op-006',
    name: 'EigenLabs Node',
    stake: 620.1,
    performance: 98.9,
    uptime: 99.75,
    status: 'warning',
    delegators: 45,
    apr: 9.8,
  },
  {
    id: 'op-007',
    name: 'DataOracle Ops',
    stake: 545.6,
    performance: 99.5,
    uptime: 99.88,
    status: 'active',
    delegators: 52,
    apr: 10.2,
  },
  {
    id: 'op-008',
    name: 'StakeGuard',
    stake: 420.3,
    performance: 99.2,
    uptime: 99.8,
    status: 'active',
    delegators: 38,
    apr: 10.0,
  },
];

const securityEvents = [
  {
    date: '2024-12-01',
    type: 'audit',
    title: 'AVS Security Audit Completed',
    description:
      'Comprehensive security audit by Trail of Bits completed with no critical findings.',
    status: 'success',
  },
  {
    date: '2024-11-15',
    type: 'upgrade',
    title: 'Slashing Parameters Updated',
    description: 'Slashing conditions optimized to improve economic security incentives.',
    status: 'info',
  },
  {
    date: '2024-10-20',
    type: 'incident',
    title: 'Minor Node Sync Issue',
    description: 'Brief sync delay resolved within 5 minutes. No slashing occurred.',
    status: 'warning',
  },
  {
    date: '2024-09-05',
    type: 'milestone',
    title: '100M ETH Staked Milestone',
    description: 'Total value staked through RedStone AVS exceeded 100M ETH.',
    status: 'success',
  },
];

export function RedStoneAVSView({ isLoading }: RedStoneAVSViewProps) {
  const t = useTranslations();
  const [expandedOperator, setExpandedOperator] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'stake' | 'performance' | 'apr'>('stake');

  const totalStaked = nodeOperators.reduce((sum, op) => sum + op.stake, 0);
  const totalStakers = nodeOperators.reduce((sum, op) => sum + op.delegators, 0);
  const avgAPR = aprTrendData[aprTrendData.length - 1].apr;
  const activeValidators = nodeOperators.filter((op) => op.status === 'active').length;

  const sortedOperators = [...nodeOperators].sort((a, b) => {
    switch (sortBy) {
      case 'stake':
        return b.stake - a.stake;
      case 'performance':
        return b.performance - a.performance;
      case 'apr':
        return b.apr - a.apr;
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-50 rounded-lg">
            <Shield className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('redstone.avs.overview') || 'EigenLayer AVS Integration'}
            </h2>
            <p className="text-sm text-gray-500">
              {t('redstone.avs.overviewDesc') ||
                'RedStone operates as an Actively Validated Service on EigenLayer'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.avs.totalStaked') || 'Total Staked'}
              </span>
              <Coins className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {totalStaked.toLocaleString()} ETH
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600">
                +12.5% {t('redstone.avs.last30Days') || 'last 30 days'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.avs.totalStakers') || 'Total Stakers'}
              </span>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalStakers.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600">
                +156 {t('redstone.avs.thisWeek') || 'this week'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.avs.currentAPR') || 'Current APR'}
              </span>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{avgAPR}%</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600">
                +0.3% {t('redstone.avs.fromLastMonth') || 'from last month'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('redstone.avs.activeValidators') || 'Active Validators'}
              </span>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {activeValidators}/{nodeOperators.length}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600">
                {t('redstone.avs.allSystemsNormal') || 'All systems normal'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('redstone.avs.whatIsAVS') || 'What is EigenLayer AVS?'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.avs.whatIsAVSDesc') || 'Understanding Actively Validated Services'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-6 border border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Lock className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-900">
                {t('redstone.avs.restakingSecurity') || 'Restaking Security'}
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('redstone.avs.restakingSecurityDesc') ||
                'EigenLayer allows ETH stakers to restake their assets to secure additional services. RedStone leverages this to provide an extra layer of economic security for oracle data.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white/60 rounded-md p-3">
                <div className="text-xs text-gray-500">
                  {t('redstone.avs.economicSecurity') || 'Economic Security'}
                </div>
                <div className="text-lg font-semibold text-gray-900">$2.4B+</div>
              </div>
              <div className="bg-white/60 rounded-md p-3">
                <div className="text-xs text-gray-500">
                  {t('redstone.avs.slashingProtection') || 'Slashing Protection'}
                </div>
                <div className="text-lg font-semibold text-gray-900">Active</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-semibold text-gray-900">
                {t('redstone.avs.howItWorks') || 'How It Works'}
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">1</span>
                </div>
                <p className="text-sm text-gray-600">
                  {t('redstone.avs.step1') || 'Node operators stake ETH through EigenLayer'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">2</span>
                </div>
                <p className="text-sm text-gray-600">
                  {t('redstone.avs.step2') || 'Staked ETH secures RedStone oracle operations'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">3</span>
                </div>
                <p className="text-sm text-gray-600">
                  {t('redstone.avs.step3') || 'Misbehavior results in slashing of staked assets'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">4</span>
                </div>
                <p className="text-sm text-gray-600">
                  {t('redstone.avs.step4') || 'Honest operators earn additional yield'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('redstone.avs.aprTrend') || 'APR Trend'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.avs.aprTrendDesc') || 'Historical annual percentage rate for stakers'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aprTrendData}>
                <defs>
                  <linearGradient id="aprGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis
                  domain={[7, 12]}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                  formatter={(value) => [`${value}%`, 'APR']}
                />
                <Area
                  type="monotone"
                  dataKey="apr"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#aprGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('redstone.avs.nodeOperators') || 'Node Operators'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.avs.nodeOperatorsDesc') || 'Active validators securing the RedStone AVS'}
          </p>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-500">{t('redstone.avs.sortBy') || 'Sort by'}:</span>
          <div className="flex gap-1">
            {(['stake', 'performance', 'apr'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  sortBy === option
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option === 'stake' && (t('redstone.avs.stake') || 'Stake')}
                {option === 'performance' && (t('redstone.avs.performance') || 'Performance')}
                {option === 'apr' && 'APR'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.avs.operator') || 'Operator'}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.avs.stake') || 'Stake (ETH)'}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.avs.performance') || 'Performance'}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.avs.uptime') || 'Uptime'}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">APR</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('redstone.avs.status') || 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedOperators.map((operator) => (
                  <tr
                    key={operator.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {operator.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{operator.name}</div>
                          <div className="text-xs text-gray-500">
                            {operator.delegators} {t('redstone.avs.delegators') || 'delegators'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {operator.stake.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-gray-900">{operator.performance}%</span>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${operator.performance}%`,
                              backgroundColor:
                                operator.performance >= 99.5
                                  ? '#10b981'
                                  : operator.performance >= 99
                                    ? '#3b82f6'
                                    : '#f59e0b',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-gray-900">{operator.uptime}%</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-medium text-emerald-600">{operator.apr}%</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        {operator.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">
                            <CheckCircle className="w-3 h-3" />
                            {t('redstone.avs.active') || 'Active'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            {t('redstone.avs.warning') || 'Warning'}
                          </span>
                        )}
                      </div>
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
            {t('redstone.avs.stakeDistribution') || 'Stake Distribution'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.avs.stakeDistributionDesc') ||
              'Distribution of stake across operator categories'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stakeDistributionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis
                    dataKey="range"
                    type="category"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="operators" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            {stakeDistributionData.map((item, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{item.range}</span>
                  <span className="text-sm text-gray-500">{item.percentage}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: chartColors.oracle.redstone,
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {item.operators} {t('redstone.avs.operators') || 'operators'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('redstone.avs.securityMetrics') || 'Security Metrics'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('redstone.avs.securityMetricsDesc') ||
              'Economic security and validator health indicators'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Shield className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-sm text-gray-500">
                {t('redstone.avs.securityThreshold') || 'Security Threshold'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">$2.4B</div>
            <p className="text-xs text-gray-500 mt-1">
              {t('redstone.avs.securityThresholdDesc') ||
                'Minimum stake required for Byzantine fault tolerance'}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-sm text-gray-500">
                {t('redstone.avs.activeNodes') || 'Active Nodes'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{activeValidators}</div>
            <p className="text-xs text-gray-500 mt-1">
              {t('redstone.avs.activeNodesDesc') || 'Nodes actively validating oracle data'}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-sm text-gray-500">
                {t('redstone.avs.avgResponseTime') || 'Avg Response Time'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">125ms</div>
            <p className="text-xs text-gray-500 mt-1">
              {t('redstone.avs.avgResponseTimeDesc') || 'Average time for data validation'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">
              {t('redstone.avs.securityEvents') || 'Recent Security Events'}
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {securityEvents.map((event, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      event.status === 'success'
                        ? 'bg-emerald-100'
                        : event.status === 'warning'
                          ? 'bg-amber-100'
                          : 'bg-blue-100'
                    }`}
                  >
                    {event.status === 'success' && (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    )}
                    {event.status === 'warning' && (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                    {event.status === 'info' && <Activity className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                      <span className="text-xs text-gray-500">{event.date}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6 border border-red-100">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Shield className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">
              {t('redstone.avs.slashingMechanism') || 'Slashing Mechanism'}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {t('redstone.avs.slashingMechanismDesc') ||
                'Node operators can have their staked ETH slashed for misbehavior, including: submitting invalid data, extended downtime, or failing to respond to data requests. This economic security ensures honest behavior.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/60 rounded-md p-3">
                <div className="text-xs text-gray-500 mb-1">
                  {t('redstone.avs.maxSlash') || 'Max Slash'}
                </div>
                <div className="text-lg font-semibold text-gray-900">10% of stake</div>
              </div>
              <div className="bg-white/60 rounded-md p-3">
                <div className="text-xs text-gray-500 mb-1">
                  {t('redstone.avs.downtimeThreshold') || 'Downtime Threshold'}
                </div>
                <div className="text-lg font-semibold text-gray-900">4 hours</div>
              </div>
              <div className="bg-white/60 rounded-md p-3">
                <div className="text-xs text-gray-500 mb-1">
                  {t('redstone.avs.totalSlashed') || 'Total Slashed'}
                </div>
                <div className="text-lg font-semibold text-gray-900">0 ETH</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ExternalLink className="w-4 h-4" />
          <span>{t('redstone.avs.learnMore') || 'Learn more about'}</span>
          <a
            href="https://www.eigenlayer.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-500 hover:text-red-600 font-medium"
          >
            EigenLayer
          </a>
        </div>
        <div className="text-xs text-gray-400">
          {t('redstone.avs.lastUpdated') || 'Last updated'}: {new Date().toLocaleString()}
        </div>
      </section>
    </div>
  );
}
