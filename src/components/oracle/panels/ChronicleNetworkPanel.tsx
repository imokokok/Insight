'use client';

import { useTranslations } from '@/i18n';
import { ChronicleNetworkStats, ValidatorNetwork } from '@/lib/oracles/chronicle';
import { DashboardCard } from '../common/DashboardCard';
import {
  Network,
  Activity,
  Zap,
  Shield,
  Users,
  Globe,
  Clock,
  TrendingUp,
  Server,
} from 'lucide-react';

interface ChronicleNetworkPanelProps {
  networkStats: ChronicleNetworkStats;
  validatorMetrics: ValidatorNetwork;
}

export function ChronicleNetworkPanel({
  networkStats,
  validatorMetrics,
}: ChronicleNetworkPanelProps) {
  const t = useTranslations();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'offline':
        return 'bg-danger-50 text-danger-700 border-danger-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getNetworkHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'good':
        return 'text-primary-600 bg-primary-50 border-primary-200';
      case 'fair':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'poor':
        return 'text-danger-600 bg-danger-50 border-danger-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const maxActivity = Math.max(...networkStats.hourlyActivity);

  return (
    <div className="space-y-6">
      {/* Network Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard title={t('chronicle.network.status')} className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border capitalize ${getStatusColor(
                  networkStats.status
                )}`}
              >
                {t(`chronicle.network.${networkStats.status}`)}
              </span>
              <p className="text-xs text-gray-500 mt-2">
                {t('chronicle.network.uptime')}: {networkStats.nodeUptime}%
              </p>
            </div>
            <div className="p-3 bg-success-50 rounded-full">
              <Network className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('chronicle.network.validators')} className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {validatorMetrics.activeValidators}/{validatorMetrics.totalValidators}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('chronicle.network.activeValidators')}
              </p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('chronicle.network.responseTime')} className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{networkStats.avgResponseTime}ms</p>
              <p className="text-xs text-gray-500 mt-1">{t('chronicle.network.avgLatency')}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-full">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('chronicle.network.dataFeeds')} className="bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{networkStats.dataFeeds}</p>
              <p className="text-xs text-gray-500 mt-1">{t('chronicle.network.activeFeeds')}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Network Health & Validator Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('chronicle.network.healthOverview')} className="bg-white">
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border ${getNetworkHealthColor(validatorMetrics.networkHealth)}`}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5" />
                <div>
                  <p className="font-semibold capitalize">
                    {t(`chronicle.network.${validatorMetrics.networkHealth}`)}
                  </p>
                  <p className="text-sm opacity-80">{t('chronicle.network.networkHealthStatus')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('chronicle.network.totalStaked')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(networkStats.totalStaked / 1e6).toFixed(2)}M {networkStats.stakingTokenSymbol}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">
                  {t('chronicle.network.updateFrequency')}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {networkStats.updateFrequency}s
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('chronicle.network.avgReputation')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {validatorMetrics.averageReputation}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('chronicle.network.latency')}</p>
                <p className="text-lg font-semibold text-gray-900">{networkStats.latency}ms</p>
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('chronicle.network.validatorDistribution')} className="bg-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-success-500" />
                <span className="text-sm font-medium text-gray-700">
                  {t('chronicle.network.active')}
                </span>
              </div>
              <span className="text-lg font-semibold text-success-700">
                {validatorMetrics.activeValidators}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {t('chronicle.network.inactive')}
                </span>
              </div>
              <span className="text-lg font-semibold text-gray-700">
                {validatorMetrics.totalValidators - validatorMetrics.activeValidators}
              </span>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-3">
                {t('chronicle.network.stakingDistribution')}
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t('chronicle.network.totalStaked')}</span>
                  <span className="font-medium text-gray-900">
                    {(validatorMetrics.totalStaked / 1e6).toFixed(2)}M
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-2">
                  <div
                    className="bg-amber-500 h-2 transition-all duration-500"
                    style={{
                      width: `${Math.min((validatorMetrics.totalStaked / 5e7) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Hourly Activity Chart */}
      <DashboardCard title={t('chronicle.network.hourlyActivity')} className="bg-white">
        <div className="h-48 flex items-end gap-1">
          {networkStats.hourlyActivity.map((activity, index) => (
            <div
              key={index}
              className="flex-1 bg-amber-500 hover:bg-amber-600 transition-colors"
              style={{
                height: `${(activity / maxActivity) * 100}%`,
                minHeight: '4px',
              }}
              title={`${index}:00 - ${activity} updates`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </DashboardCard>

      {/* Network Features */}
      <DashboardCard title={t('chronicle.network.features')} className="bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Globe className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {t('chronicle.network.decentralized')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('chronicle.network.decentralizedDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('chronicle.network.realtime')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('chronicle.network.realtimeDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('chronicle.network.scalable')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('chronicle.network.scalableDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Server className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('chronicle.network.reliable')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('chronicle.network.reliableDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Shield className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('chronicle.network.secure')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('chronicle.network.secureDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Activity className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {t('chronicle.network.monitoring')}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t('chronicle.network.monitoringDesc')}</p>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
