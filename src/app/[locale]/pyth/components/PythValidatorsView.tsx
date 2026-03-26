'use client';

import { useState, useMemo } from 'react';

import { Activity, Shield, Clock, Award, ArrowUpDown } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type PythValidatorsViewProps } from '../types';

type SortField = 'stake' | 'uptime' | 'name' | 'rewards';
type SortOrder = 'asc' | 'desc';

export function PythValidatorsView({ validators, isLoading }: PythValidatorsViewProps) {
  const t = useTranslations();
  const [sortField, setSortField] = useState<SortField>('stake');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sortedValidators = useMemo(() => {
    return [...validators].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'stake':
          comparison = (a.stake ?? 0) - (b.stake ?? 0);
          break;
        case 'uptime':
          comparison = (a.uptime ?? 0) - (b.uptime ?? 0);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rewards':
          comparison = (a.rewards ?? 0) - (b.rewards ?? 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [validators, sortField, sortOrder]);

  const totalValidators = validators.length;
  const activeValidators = validators.filter((v) => v.status === 'active').length;
  const totalStake = validators.reduce((sum, v) => sum + (v.stake ?? 0), 0);
  const avgUptime = validators.length
    ? (validators.reduce((sum, v) => sum + (v.uptime ?? 0), 0) / validators.length).toFixed(1)
    : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-emerald-700 bg-emerald-50';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      case 'jailed':
        return 'text-red-700 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99) return 'text-emerald-600';
    if (uptime >= 95) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-8">
      {/* 统计概览 - 行内展示 */}
      <div className="flex flex-wrap items-center gap-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {t('pyth.validators.total') || 'Total Validators'}
          </span>
          <span className="text-lg font-semibold text-gray-900">{totalValidators}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span className="text-sm text-gray-500">{t('pyth.validators.active') || 'Active'}</span>
          <span className="text-lg font-semibold text-emerald-600">{activeValidators}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {t('pyth.validators.totalStaked') || 'Total Staked'}
          </span>
          <span className="text-lg font-semibold text-gray-900">
            {(totalStake / 1e9).toFixed(2)}B PYTH
          </span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {t('pyth.validators.avgUptime') || 'Avg Uptime'}
          </span>
          <span className="text-lg font-semibold text-gray-900">{avgUptime}%</span>
        </div>
      </div>

      {/* 排序控制 */}
      <div className="flex gap-2">
        <button
          onClick={() => handleSort('name')}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
            sortField === 'name'
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {t('pyth.validators.sortByName') || 'Name'}
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleSort('stake')}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
            sortField === 'stake'
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {t('pyth.validators.sortByStake') || 'Stake'}
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleSort('uptime')}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
            sortField === 'uptime'
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {t('pyth.validators.sortByUptime') || 'Uptime'}
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleSort('rewards')}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
            sortField === 'rewards'
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {t('pyth.validators.sortByRewards') || 'Rewards'}
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 数据表格 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                {t('pyth.validators.name') || 'Name'}
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                {t('pyth.validators.status') || 'Status'}
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                {t('pyth.validators.stake') || 'Stake'}
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                {t('pyth.validators.uptime') || 'Uptime'}
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                {t('pyth.validators.rewards') || 'Rewards'}
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
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(
                      validator.status
                    )}`}
                  >
                    {validator.status === 'active'
                      ? t('pyth.validators.statusActive') || 'Active'
                      : validator.status === 'inactive'
                        ? t('pyth.validators.statusInactive') || 'Inactive'
                        : t('pyth.validators.statusJailed') || 'Jailed'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-sm">
                  {((validator.stake ?? 0) / 1e6).toFixed(1)}M PYTH
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={`text-sm font-medium ${getUptimeColor(validator.uptime ?? 0)}`}>
                    {validator.uptime ?? 0}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-sm">
                  {((validator.rewards ?? 0) / 1e3).toFixed(1)}K PYTH
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 空状态 */}
      {sortedValidators.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">
            {t('pyth.validators.noResults') || 'No validators found'}
          </p>
        </div>
      )}
    </div>
  );
}
