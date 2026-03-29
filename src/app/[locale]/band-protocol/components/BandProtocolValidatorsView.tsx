'use client';

import { useState, useMemo, useCallback } from 'react';

import { AlertTriangle, AlertCircle, ArrowUpDown, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { ValidatorInfo } from '@/lib/oracles/bandProtocol';

import { type BandProtocolValidatorsViewProps, type SortConfig } from '../types';

export function BandProtocolValidatorsView({
  validators,
  isLoading,
  error,
  onRefresh,
}: BandProtocolValidatorsViewProps) {
  const t = useTranslations();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'rank', direction: 'asc' });

  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('band.bandProtocol.validators.loadError')}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {error.message || t('band.bandProtocol.validators.failedToLoad')}
          </p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('band.bandProtocol.validators.retry')}
          </button>
        </div>
      </div>
    );
  }

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

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: string }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <button
        onClick={() => handleSort(sortKey)}
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
          isActive ? 'text-purple-600' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {label}
        <ArrowUpDown className={`w-3 h-3 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            {t('band.bandProtocol.validators.totalValidators')}
          </span>
          <span className="text-sm font-semibold text-gray-900">{validators.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            {t('band.bandProtocol.validators.totalStaked')}
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {(totalStaked / 1e6).toFixed(1)}M BAND
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            {t('band.bandProtocol.validators.avgCommission')}
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {(avgCommission * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            {t('band.bandProtocol.validators.avgUptime')}
          </span>
          <span className="text-sm font-semibold text-gray-900">{avgUptime.toFixed(2)}%</span>
        </div>
        {onRefresh && (
          <div className="ml-auto">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {t('band.bandProtocol.validators.refresh')}
            </button>
          </div>
        )}
      </div>

      {/* Jailed Warning Banner */}
      {jailedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-sm text-amber-800">
              {t('band.bandProtocol.validators.jailedWarning', { count: jailedCount })}
            </span>
          </div>
        </div>
      )}

      {/* Validators Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left whitespace-nowrap">
                  <SortHeader label={t('band.bandProtocol.validators.rank')} sortKey="rank" />
                </th>
                <th className="px-3 py-2 text-left whitespace-nowrap">
                  <SortHeader
                    label={t('band.bandProtocol.validators.validator')}
                    sortKey="moniker"
                  />
                </th>
                <th className="px-3 py-2 text-right whitespace-nowrap">
                  <SortHeader
                    label={t('band.bandProtocol.validators.votingPower')}
                    sortKey="tokens"
                  />
                </th>
                <th className="px-3 py-2 text-right whitespace-nowrap">
                  <SortHeader
                    label={t('band.bandProtocol.validators.commission')}
                    sortKey="commissionRate"
                  />
                </th>
                <th className="px-3 py-2 text-right whitespace-nowrap">
                  <SortHeader label={t('band.bandProtocol.validators.uptime')} sortKey="uptime" />
                </th>
                <th className="px-3 py-2 text-center whitespace-nowrap">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('band.bandProtocol.validators.status')}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedValidators.map((validator) => (
                <tr
                  key={validator.operatorAddress}
                  className={`hover:bg-gray-50 transition-colors ${validator.jailed ? 'bg-red-50/50' : ''}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                      {validator.rank}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-gray-900">{validator.moniker}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[160px] font-mono">
                        {validator.operatorAddress.slice(0, 20)}...
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <p className="font-medium text-gray-900">
                      {(validator.tokens / 1e6).toFixed(2)}M
                    </p>
                    <p className="text-xs text-gray-500">
                      {((validator.tokens / totalStaked) * 100).toFixed(2)}%
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <span className="text-gray-900">
                      {(validator.commissionRate * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <span
                      className={`font-medium ${
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
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    {validator.jailed ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                        <XCircle className="w-3 h-3" />
                        <span>{t('band.bandProtocol.validators.jailed')}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t('band.bandProtocol.validators.active')}</span>
                      </div>
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
