'use client';

import { useTranslations } from 'next-intl';
import { PythValidatorsViewProps } from '../types';

interface FlatStatItemProps {
  label: string;
  value: string | number;
  className?: string;
}

function FlatStatItem({ label, value, className = '' }: FlatStatItemProps) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export function PythValidatorsView({ validators, isLoading }: PythValidatorsViewProps) {
  const t = useTranslations();

  const totalValidators = validators.length;
  const activeValidators = validators.filter((v) => v.status === 'active').length;
  const totalStake = validators.reduce((sum, v) => sum + v.stake, 0);
  const avgUptime = validators.length
    ? (validators.reduce((sum, v) => sum + v.uptime, 0) / validators.length).toFixed(1)
    : 0;

  const sortedValidators = [...validators].sort((a, b) => b.stake - a.stake);

  return (
    <div className="space-y-4">
      {/* Validator Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-gray-200 rounded-lg bg-white">
        <FlatStatItem
          label={t('pyth.validators.totalValidators') || '验证者总数'}
          value={totalValidators}
          className="px-4 py-4 border-r border-gray-200"
        />
        <FlatStatItem
          label={t('pyth.validators.activeValidators') || '活跃验证者'}
          value={activeValidators}
          className="px-4 py-4 border-r border-gray-200"
        />
        <FlatStatItem
          label={t('pyth.validators.totalStaked') || '总质押'}
          value={`${(totalStake / 1e9).toFixed(2)}B`}
          className="px-4 py-4 border-r border-gray-200"
        />
        <FlatStatItem
          label={t('pyth.validators.avgUptime') || '平均在线率'}
          value={`${avgUptime}%`}
          className="px-4 py-4"
        />
      </div>

      {/* Validators Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.validators.name') || '名称'}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.validators.status') || '状态'}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.validators.stake') || '质押'}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.validators.uptime') || '在线率'}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                  {t('pyth.validators.rewards') || '奖励'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedValidators.map((validator) => (
                <tr
                  key={validator.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">{validator.name}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        validator.status === 'active'
                          ? 'text-emerald-700 bg-emerald-50'
                          : validator.status === 'inactive'
                            ? 'text-gray-600 bg-gray-100'
                            : 'text-red-700 bg-red-50'
                      }`}
                    >
                      {validator.status === 'active'
                        ? t('pyth.validators.statusActive') || '活跃'
                        : validator.status === 'inactive'
                          ? t('pyth.validators.statusInactive') || '离线'
                          : t('pyth.validators.statusJailed') || '监禁'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm">
                    {(validator.stake / 1e6).toFixed(1)}M PYTH
                  </td>
                  <td className="py-3 px-4 text-right text-sm">
                    <span
                      className={
                        validator.uptime >= 99
                          ? 'text-emerald-600 font-medium'
                          : validator.uptime >= 95
                            ? 'text-amber-600 font-medium'
                            : 'text-red-600 font-medium'
                      }
                    >
                      {validator.uptime}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm">
                    {(validator.rewards / 1e3).toFixed(1)}K PYTH
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
