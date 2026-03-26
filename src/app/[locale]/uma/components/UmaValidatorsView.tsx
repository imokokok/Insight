'use client';

import {
  Users,
  Clock,
  Shield,
  Award,
  TrendingUp,
  Building2,
  UserCircle2,
  UsersRound,
} from 'lucide-react';

import { ValidatorAnalyticsPanel } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type UmaValidatorsViewProps } from '../types';

export function UmaValidatorsView({ validators, networkStats, isLoading }: UmaValidatorsViewProps) {
  const t = useTranslations();

  const totalStaked = validators.reduce((sum, v) => sum + v.staked, 0);
  const totalEarnings = validators.reduce((sum, v) => sum + v.earnings, 0);
  const avgSuccessRate =
    validators.length > 0
      ? validators.reduce((sum, v) => sum + v.successRate, 0) / validators.length
      : 0;
  const avgResponseTime =
    validators.length > 0
      ? validators.reduce((sum, v) => sum + v.responseTime, 0) / validators.length
      : 0;

  // 验证者类型分布统计
  const typeStats = [
    {
      type: 'institution',
      label: t('uma.validators.types.institution'),
      count: validators.filter((v) => v.type === 'institution').length,
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      type: 'community',
      label: t('uma.validators.types.community'),
      count: validators.filter((v) => v.type === 'community').length,
      icon: UsersRound,
      color: 'bg-purple-500',
    },
    {
      type: 'independent',
      label: t('uma.validators.types.independent'),
      count: validators.filter((v) => v.type === 'independent').length,
      icon: UserCircle2,
      color: 'bg-gray-400',
    },
  ];

  const totalCount = validators.length || 1;

  return (
    <div className="space-y-8">
      {/* 统计概览 - 行内内联布局 */}
      <div className="flex flex-wrap items-center gap-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('uma.validators.totalValidators')}</span>
          <span className="text-lg font-semibold text-gray-900">{validators.length}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('uma.validators.avgResponseTime')}</span>
          <span className="text-lg font-semibold text-gray-900">
            {Math.round(avgResponseTime)}ms
          </span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('uma.validators.avgSuccessRate')}</span>
          <span className="text-lg font-semibold text-emerald-600">
            {avgSuccessRate.toFixed(1)}%
          </span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('uma.validators.totalStaked')}</span>
          <span className="text-lg font-semibold text-gray-900">
            ${(totalStaked / 1e6).toFixed(2)}M
          </span>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 左侧 - 验证者表格 */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-medium text-gray-900">
              {t('uma.validators.validatorList')}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 text-sm font-medium text-gray-900">
                    {t('uma.validators.name')}
                  </th>
                  <th className="text-left py-3 px-3 text-sm font-medium text-gray-900">
                    {t('uma.validators.type')}
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-medium text-gray-900">
                    {t('uma.validators.staked')}
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-medium text-gray-900">
                    {t('uma.validators.successRate')}
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-medium text-gray-900">
                    {t('uma.validators.responseTime')}
                  </th>
                  <th className="text-right py-3 px-3 text-sm font-medium text-gray-900">
                    {t('uma.validators.earnings')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {validators.map((validator) => (
                  <tr key={validator.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 px-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{validator.name}</p>
                        <p className="text-xs text-gray-500 font-mono truncate max-w-[150px]">
                          {validator.address}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-sm ${
                          validator.type === 'institution'
                            ? 'text-blue-600'
                            : validator.type === 'community'
                              ? 'text-purple-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {validator.type === 'institution' && <Building2 className="w-3.5 h-3.5" />}
                        {validator.type === 'community' && <UsersRound className="w-3.5 h-3.5" />}
                        {validator.type === 'independent' && (
                          <UserCircle2 className="w-3.5 h-3.5" />
                        )}
                        {validator.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-900 text-right">
                      ${validator.staked.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-900 text-right">
                      {validator.successRate}%
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-900 text-right">
                      {validator.responseTime}ms
                    </td>
                    <td className="py-3 px-3 text-sm text-emerald-600 text-right">
                      ${validator.earnings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 右侧边栏 */}
        <div className="space-y-8">
          {/* 验证者类型分布 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">
                {t('uma.validators.typeDistribution')}
              </h3>
            </div>
            <div className="space-y-4">
              {typeStats.map((stat) => {
                const percentage = (stat.count / totalCount) * 100;
                const Icon = stat.icon;
                return (
                  <div key={stat.type}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{stat.label}</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {stat.count}{' '}
                        <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5">
                      <div
                        className={`${stat.color} h-1.5 transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 概览统计 */}
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">{t('uma.validators.overview')}</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('uma.validators.totalEarnings')}</span>
                <span className="font-medium text-gray-900">
                  ${(totalEarnings / 1e3).toFixed(1)}K
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('uma.validators.avgStaked')}</span>
                <span className="font-medium text-gray-900">
                  ${(totalStaked / validators.length / 1e3).toFixed(1)}K
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('uma.validators.avgEarnings')}</span>
                <span className="font-medium text-gray-900">
                  ${(totalEarnings / validators.length / 1e3).toFixed(1)}K
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Validator Analytics Panel */}
      <div className="border-t border-gray-200 pt-8">
        <ValidatorAnalyticsPanel />
      </div>
    </div>
  );
}
