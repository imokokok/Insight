'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { BandProtocolValidatorsViewProps, SortConfig } from '../types';
import { ValidatorInfo } from '@/lib/oracles/bandProtocol';

export function BandProtocolValidatorsView({
  validators,
  isLoading,
}: BandProtocolValidatorsViewProps) {
  const t = useTranslations();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'rank', direction: 'asc' });

  const sortedValidators = useMemo(() => {
    if (!validators.length) return [];
    const sorted = [...validators];
    sorted.sort((a, b) => {
      let aValue: number | string = '';
      let bValue: number | string = '';

      switch (sortConfig.key) {
        case 'rank':
          aValue = a.rank;
          bValue = b.rank;
          break;
        case 'moniker':
          aValue = a.moniker;
          bValue = b.moniker;
          break;
        case 'tokens':
          aValue = a.tokens;
          bValue = b.tokens;
          break;
        case 'commissionRate':
          aValue = a.commissionRate;
          bValue = b.commissionRate;
          break;
        case 'uptime':
          aValue = a.uptime;
          bValue = b.uptime;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    return sorted;
  }, [validators, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const totalStaked = validators.reduce((sum, v) => sum + v.tokens, 0);
  const avgCommission = validators.length
    ? validators.reduce((sum, v) => sum + v.commissionRate, 0) / validators.length
    : 0;
  const avgUptime = validators.length
    ? validators.reduce((sum, v) => sum + v.uptime, 0) / validators.length
    : 0;
  const jailedCount = validators.filter((v) => v.jailed).length;

  const stats = [
    {
      label: t('bandProtocol.validators.totalValidators'),
      value: validators.length.toString(),
    },
    {
      label: t('bandProtocol.validators.totalStaked'),
      value: `${(totalStaked / 1e6).toFixed(1)}M BAND`,
    },
    {
      label: t('bandProtocol.validators.avgCommission'),
      value: `${(avgCommission * 100).toFixed(1)}%`,
    },
    {
      label: t('bandProtocol.validators.avgUptime'),
      value: `${avgUptime.toFixed(2)}%`,
    },
  ];

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <button
      onClick={() => handleSort(sortKey)}
      className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
    >
      {label}
      {sortConfig.key === sortKey && (
        <span className="text-purple-600">
          {sortConfig.direction === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {jailedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm text-amber-800">
              {t('bandProtocol.validators.jailedWarning', { count: jailedCount })}
            </span>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <SortHeader label={t('bandProtocol.validators.rank')} sortKey="rank" />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader label={t('bandProtocol.validators.validator')} sortKey="moniker" />
                </th>
                <th className="px-4 py-3 text-right">
                  <SortHeader label={t('bandProtocol.validators.votingPower')} sortKey="tokens" />
                </th>
                <th className="px-4 py-3 text-right">
                  <SortHeader label={t('bandProtocol.validators.commission')} sortKey="commissionRate" />
                </th>
                <th className="px-4 py-3 text-right">
                  <SortHeader label={t('bandProtocol.validators.uptime')} sortKey="uptime" />
                </th>
                <th className="px-4 py-3 text-center">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('bandProtocol.validators.status')}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedValidators.map((validator) => (
                <tr
                  key={validator.operatorAddress}
                  className={`hover:bg-gray-50 ${validator.jailed ? 'bg-red-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                      {validator.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{validator.moniker}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {validator.operatorAddress}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {(validator.tokens / 1e6).toFixed(2)}M
                    </p>
                    <p className="text-xs text-gray-500">
                      {((validator.tokens / totalStaked) * 100).toFixed(2)}%
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">
                      {(validator.commissionRate * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-medium ${
                        validator.uptime >= 99
                          ? 'text-emerald-600'
                          : validator.uptime >= 95
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {validator.uptime.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {validator.jailed ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                        {t('bandProtocol.validators.jailed')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
                        {t('bandProtocol.validators.active')}
                      </span>
                    )}
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
