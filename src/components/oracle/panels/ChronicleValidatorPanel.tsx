'use client';

import { useTranslations } from 'next-intl';
import { ValidatorNetwork, ChronicleValidator } from '@/lib/oracles/chronicle';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { Users, Activity, Award, Coins, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ChronicleValidatorPanelProps {
  data: ValidatorNetwork;
}

export function ChronicleValidatorPanel({ data }: ChronicleValidatorPanelProps) {
  const t = useTranslations();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-success-600" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      case 'jailed':
        return <AlertCircle className="w-4 h-4 text-danger-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'inactive':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'jailed':
        return 'bg-danger-50 text-danger-700 border-danger-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getNetworkHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'text-emerald-600';
      case 'good':
        return 'text-primary-600';
      case 'fair':
        return 'text-amber-600';
      case 'poor':
        return 'text-danger-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Validator Stats */}
      <DashboardCard title={t('chronicle.validators.title')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-gray-500">{t('chronicle.validators.total')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.totalValidators}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-success-600" />
              <p className="text-xs text-gray-500">{t('chronicle.validators.active')}</p>
            </div>
            <p className="text-xl font-bold text-success-600">{data.activeValidators}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-500">{t('chronicle.validators.avgReputation')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.averageReputation}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-primary-600" />
              <p className="text-xs text-gray-500">{t('chronicle.validators.totalStaked')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {(data.totalStaked / 1e6).toFixed(2)}M
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {t('chronicle.validators.networkHealth')}:{' '}
            <span className={`font-medium capitalize ${getNetworkHealthColor(data.networkHealth)}`}>
              {data.networkHealth}
            </span>
          </p>
        </div>
      </DashboardCard>

      {/* Validators List */}
      <DashboardCard title={t('chronicle.validators.list')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.validators.name')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.validators.reputation')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.validators.uptime')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.validators.responseTime')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.validators.staked')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.validators.status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.validators.map((validator, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <div>
                      <p className="font-semibold text-gray-900">{validator.name}</p>
                      <p className="text-xs text-gray-500">{validator.address}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${validator.reputationScore}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700">{validator.reputationScore}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-900">{validator.uptime}%</td>
                  <td className="py-2 px-3 text-gray-900">{validator.responseTime}ms</td>
                  <td className="py-2 px-3 text-gray-900">
                    {(validator.stakedAmount / 1e6).toFixed(2)}M
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(validator.status)}
                      <span
                        className={`px-2 py-1 text-xs font-medium capitalize border ${getStatusColor(validator.status)}`}
                      >
                        {t(`chronicle.status.${validator.status}`)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
