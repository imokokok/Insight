'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BandProtocolClient, ValidatorInfo } from '@/lib/oracles/bandProtocol';
import { ValidatorData } from '@/lib/oracles/uma';
import { formatNumber } from '@/lib/utils/format';
import { useTranslations } from 'next-intl';
import { StakingDistributionChart } from '../../charts/StakingDistributionChart';
import { ValidatorComparison } from '../../charts/ValidatorComparison';
import { MultiValidatorComparison } from '../../charts/MultiValidatorComparison';
import { SortField, SortDirection, FilterStatus, QuickFilter, ValidatorPanelProps } from './config';
import { ValidatorDetailModal } from './ValidatorDetailModal';
import {
  SortButton,
  FilterButton,
  MobileValidatorList,
  DesktopValidatorTable,
} from './ValidatorRow';

export function ValidatorPanel({
  client,
  limit = 20,
  autoUpdate = true,
  updateInterval = 60000,
}: ValidatorPanelProps & { client: BandProtocolClient }) {
  const t = useTranslations();
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [filteredValidators, setFilteredValidators] = useState<ValidatorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [selectedValidator, setSelectedValidator] = useState<ValidatorInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedValidatorAddresses, setSelectedValidatorAddresses] = useState<Set<string>>(
    new Set()
  );
  const [isMobile, setIsMobile] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const convertToValidatorData = useCallback((validator: ValidatorInfo): ValidatorData => {
    const types: ('institution' | 'independent' | 'community')[] = [
      'institution',
      'independent',
      'community',
    ];
    const regions = [
      t('validatorPanel.region.northAmerica'),
      t('validatorPanel.region.europe'),
      t('validatorPanel.region.asia'),
      t('validatorPanel.region.other'),
    ];

    return {
      id: validator.operatorAddress,
      name: validator.moniker,
      type: types[validator.rank % 3],
      region: regions[validator.rank % 4],
      responseTime: Math.round(100 + Math.random() * 200),
      successRate: validator.uptime,
      reputation: Math.round(70 + validator.uptime * 0.3),
      staked: validator.tokens,
      earnings: Math.round(validator.tokens * validator.commissionRate * 100),
      address: validator.operatorAddress,
    };
  }, []);

  const selectedValidatorsData = useMemo(() => {
    return validators
      .filter((v) => selectedValidatorAddresses.has(v.operatorAddress))
      .map(convertToValidatorData);
  }, [validators, selectedValidatorAddresses, convertToValidatorData]);

  const selectedValidatorsInfo = useMemo(() => {
    return validators.filter((v) => selectedValidatorAddresses.has(v.operatorAddress));
  }, [validators, selectedValidatorAddresses]);

  const fetchValidators = useCallback(async () => {
    try {
      const data = await client.getValidators(limit);
      setValidators(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch validators');
    } finally {
      setIsLoading(false);
    }
  }, [client, limit, t]);

  useEffect(() => {
    fetchValidators();

    if (autoUpdate) {
      intervalRef.current = setInterval(fetchValidators, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchValidators, autoUpdate, updateInterval]);

  useEffect(() => {
    let result = [...validators];

    if (filterStatus === 'active') {
      result = result.filter((v) => !v.jailed);
    } else if (filterStatus === 'jailed') {
      result = result.filter((v) => v.jailed);
    }

    if (quickFilter === 'lowCommission') {
      result = result.filter((v) => v.commissionRate < 0.05);
    } else if (quickFilter === 'highStake') {
      const sortedByStake = [...validators].sort((a, b) => b.tokens - a.tokens);
      const top20Percent = Math.ceil(sortedByStake.length * 0.2);
      const topAddresses = new Set(
        sortedByStake.slice(0, top20Percent).map((v) => v.operatorAddress)
      );
      result = result.filter((v) => topAddresses.has(v.operatorAddress));
    } else if (quickFilter === 'highUptime') {
      result = result.filter((v) => v.uptime >= 99.9);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'tokens':
          comparison = a.tokens - b.tokens;
          break;
        case 'commissionRate':
          comparison = a.commissionRate - b.commissionRate;
          break;
        case 'uptime':
          comparison = a.uptime - b.uptime;
          break;
        case 'rank':
        default:
          comparison = a.rank - b.rank;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredValidators(result);
  }, [validators, sortField, sortDirection, filterStatus, quickFilter]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleValidatorClick = (validator: ValidatorInfo) => {
    setSelectedValidator(validator);
    setIsModalOpen(true);
  };

  const handleToggleSelect = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    setSelectedValidatorAddresses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else if (newSet.size < 4) {
        newSet.add(address);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedValidatorAddresses(new Set());
  };

  const handleSegmentClick = (validator: ValidatorInfo) => {
    setSelectedValidator(validator);
    setIsModalOpen(true);
  };

  const activeCount = validators.filter((v) => !v.jailed).length;
  const jailedCount = validators.filter((v) => v.jailed).length;

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-gray-500 text-sm">{t('validatorPanel.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 p-6">
        <div className="flex items-center gap-3 text-red-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StakingDistributionChart validators={validators} onSegmentClick={handleSegmentClick} />

      <div className="bg-white border border-gray-200 overflow-hidden @container">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('validatorPanel.title')}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {t('validatorPanel.subtitle', { count: filteredValidators.length })}
                {quickFilter !== 'all' && (
                  <span className="text-blue-600 ml-1">{t('validatorPanel.filtered')}</span>
                )}
                {' • '}
                {t('validatorPanel.totalStaked')}{' '}
                {formatNumber(
                  validators.reduce((sum, v) => sum + v.tokens, 0),
                  true
                )}{' '}
                BAND
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SortButton
                field="rank"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                label={t('validatorPanel.rank')}
              />
              <SortButton
                field="tokens"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                label={t('validatorPanel.stakeAmount')}
              />
              <SortButton
                field="commissionRate"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                label={t('validatorPanel.commissionRate')}
              />
              <SortButton
                field="uptime"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                label={t('validatorPanel.uptime')}
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 mr-1">{t('validatorPanel.statusLabel')}:</span>
            <FilterButton
              status="all"
              currentStatus={filterStatus}
              onFilter={setFilterStatus}
              label={t('validatorPanel.all')}
              count={validators.length}
            />
            <FilterButton
              status="active"
              currentStatus={filterStatus}
              onFilter={setFilterStatus}
              label={t('validatorPanel.status.active')}
              count={activeCount}
            />
            <FilterButton
              status="jailed"
              currentStatus={filterStatus}
              onFilter={setFilterStatus}
              label={t('validatorPanel.status.jailed')}
              count={jailedCount}
            />
          </div>
        </div>

        <div className="px-5 py-3 bg-purple-50 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-purple-600 mr-1">{t('validatorPanel.quickFilter')}:</span>
            <button
              onClick={() => setQuickFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium border transition-all ${
                quickFilter === 'all'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white border-purple-200 text-purple-600 hover:border-purple-400'
              }`}
            >
              {t('validatorPanel.all')}
            </button>
            <button
              onClick={() => setQuickFilter('lowCommission')}
              className={`px-3 py-1.5 text-xs font-medium border transition-all ${
                quickFilter === 'lowCommission'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white border-purple-200 text-purple-600 hover:border-purple-400'
              }`}
            >
              {t('validatorPanel.lowCommission')}
            </button>
            <button
              onClick={() => setQuickFilter('highStake')}
              className={`px-3 py-1.5 text-xs font-medium border transition-all ${
                quickFilter === 'highStake'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white border-purple-200 text-purple-600 hover:border-purple-400'
              }`}
            >
              {t('validatorPanel.highStake')}
            </button>
            <button
              onClick={() => setQuickFilter('highUptime')}
              className={`px-3 py-1.5 text-xs font-medium border transition-all ${
                quickFilter === 'highUptime'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white border-purple-200 text-purple-600 hover:border-purple-400'
              }`}
            >
              {t('validatorPanel.highUptime')}
            </button>
            {selectedValidatorAddresses.size > 0 && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-blue-600 font-medium">
                  {t('validatorPanel.selectedForComparison', {
                    count: selectedValidatorAddresses.size,
                  })}
                </span>
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-gray-500 hover:text-red-600 underline transition-colors"
                >
                  {t('validatorPanel.clearSelection')}
                </button>
              </div>
            )}
          </div>
        </div>

        {isMobile ? (
          <MobileValidatorList
            validators={filteredValidators}
            onValidatorClick={handleValidatorClick}
            selectedValidatorAddresses={selectedValidatorAddresses}
            onToggleSelect={handleToggleSelect}
          />
        ) : (
          <DesktopValidatorTable
            validators={filteredValidators}
            onValidatorClick={handleValidatorClick}
            selectedValidatorAddresses={selectedValidatorAddresses}
            onToggleSelect={handleToggleSelect}
          />
        )}
      </div>

      {selectedValidatorsInfo.length >= 2 && (
        <MultiValidatorComparison validators={selectedValidatorsInfo} client={client} />
      )}

      {selectedValidatorsData.length > 0 && (
        <ValidatorComparison validators={selectedValidatorsData} />
      )}

      <ValidatorDetailModal
        validator={selectedValidator}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        client={client}
      />
    </div>
  );
}

export type { ValidatorPanelProps, SortField, SortDirection, FilterStatus };
