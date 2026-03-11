'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BandProtocolClient, ValidatorInfo } from '@/lib/oracles/bandProtocol';
import { ValidatorData } from '@/lib/oracles/uma';
import { formatNumber } from '@/lib/utils/format';
import { StakingDistributionChart } from './StakingDistributionChart';
import { ValidatorComparison } from './ValidatorComparison';

type SortField = 'tokens' | 'commissionRate' | 'uptime' | 'rank';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'active' | 'jailed';
type QuickFilter = 'all' | 'lowCommission' | 'highStake' | 'highUptime';

interface ValidatorPanelProps {
  client: BandProtocolClient;
  limit?: number;
  autoUpdate?: boolean;
  updateInterval?: number;
}

const statusConfig = {
  active: {
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    bgLight: 'bg-green-50',
    label: '在线',
  },
  jailed: {
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    bgLight: 'bg-red-50',
    label: '监禁',
  },
};

function ValidatorDetailModal({
  validator,
  isOpen,
  onClose,
}: {
  validator: ValidatorInfo | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !validator) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">#{validator.rank}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{validator.moniker}</h2>
              <p className="text-xs text-gray-500">验证者详情</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">质押量</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(validator.tokens, true)} BAND
              </p>
              <p className="text-xs text-gray-400 mt-1">
                约 ${formatNumber(validator.tokens * 2.5, true)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">佣金率</p>
              <p className="text-xl font-bold text-gray-900">
                {(validator.commissionRate * 100).toFixed(2)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">
                最大 {(validator.maxCommissionRate * 100).toFixed(2)}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">在线率</p>
              <p className="text-xl font-bold text-green-600">{validator.uptime.toFixed(2)}%</p>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${validator.uptime}%` }}
                />
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">状态</p>
              <div className="flex items-center gap-2">
                <span className={`relative flex h-3 w-3`}>
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${validator.jailed ? 'bg-red-400' : 'bg-green-400'} opacity-75`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${validator.jailed ? 'bg-red-500' : 'bg-green-500'}`}
                  />
                </span>
                <span
                  className={`text-lg font-bold ${validator.jailed ? 'text-red-600' : 'text-green-600'}`}
                >
                  {validator.jailed ? '监禁中' : '活跃'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">验证者信息</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">操作地址</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 max-w-[200px] truncate">
                    {validator.operatorAddress}
                  </code>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">身份标识</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                    {validator.identity}
                  </code>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">委托份额</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatNumber(validator.delegatorShares, true)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">最大佣金变化率</span>
                  <span className="text-sm font-medium text-gray-900">
                    {(validator.maxCommissionChangeRate * 100).toFixed(2)}%
                  </span>
                </div>
                {validator.website && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">网站</span>
                    <a
                      href={validator.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {validator.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {validator.details && (
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">描述</p>
                <p className="text-sm text-gray-700">{validator.details}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SortButton({
  field,
  currentField,
  currentDirection,
  onSort,
  label,
}: {
  field: SortField;
  currentField: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  label: string;
}) {
  const isActive = field === currentField;

  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <span>{label}</span>
      {isActive && (
        <svg
          className={`w-3 h-3 transition-transform ${currentDirection === 'desc' ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )}
    </button>
  );
}

function FilterButton({
  status,
  currentStatus,
  onFilter,
  label,
  count,
}: {
  status: FilterStatus;
  currentStatus: FilterStatus;
  onFilter: (status: FilterStatus) => void;
  label: string;
  count?: number;
}) {
  const isActive = status === currentStatus;

  return (
    <button
      onClick={() => onFilter(status)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ValidatorRow({
  validator,
  onClick,
  isSelected,
  onToggleSelect,
}: {
  validator: ValidatorInfo;
  onClick: () => void;
  isSelected: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
}) {
  const status = validator.jailed ? 'jailed' : 'active';
  const config = statusConfig[status];

  return (
    <tr className="group cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSelect}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <div
            className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
            onClick={onClick}
          >
            <span className="text-white font-bold text-xs">#{validator.rank}</span>
          </div>
          <div onClick={onClick}>
            <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
              {validator.moniker}
            </p>
            <p className="text-xs text-gray-400 truncate max-w-[150px]">
              {validator.operatorAddress.slice(0, 20)}...
            </p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">
            {formatNumber(validator.tokens, true)}
          </span>
          <span className="text-xs text-gray-400">BAND</span>
        </div>
      </td>
      <td className="py-4 px-4" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">
            {(validator.commissionRate * 100).toFixed(2)}%
          </span>
        </div>
      </td>
      <td className="py-4 px-4" onClick={onClick}>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[80px]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                validator.uptime >= 99.5
                  ? 'bg-green-500'
                  : validator.uptime >= 99
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(validator.uptime, 100)}%` }}
            />
          </div>
          <span
            className={`text-sm font-medium ${
              validator.uptime >= 99.5
                ? 'text-green-600'
                : validator.uptime >= 99
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          >
            {validator.uptime.toFixed(2)}%
          </span>
        </div>
      </td>
      <td className="py-4 px-4" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className={`relative flex h-2.5 w-2.5`}>
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.bgColor} opacity-75`}
            />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.bgColor}`} />
          </span>
          <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
        </div>
      </td>
      <td className="py-4 px-4" onClick={onClick}>
        <svg
          className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </td>
    </tr>
  );
}

export function ValidatorPanel({
  client,
  limit = 20,
  autoUpdate = true,
  updateInterval = 60000,
}: ValidatorPanelProps) {
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const rowHeight = 64;

  const virtualizer = useVirtualizer({
    count: filteredValidators.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const convertToValidatorData = useCallback((validator: ValidatorInfo): ValidatorData => {
    const types: ('institution' | 'independent' | 'community')[] = [
      'institution',
      'independent',
      'community',
    ];
    const regions = ['北美', '欧洲', '亚洲', '其他'];

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
    };
  }, []);

  const selectedValidatorsData = useMemo(() => {
    return validators
      .filter((v) => selectedValidatorAddresses.has(v.operatorAddress))
      .map(convertToValidatorData);
  }, [validators, selectedValidatorAddresses, convertToValidatorData]);

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
  }, [client, limit]);

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

  const handleSegmentClick = (validator: ValidatorInfo) => {
    setSelectedValidator(validator);
    setIsModalOpen(true);
  };

  const activeCount = validators.filter((v) => !v.jailed).length;
  const jailedCount = validators.filter((v) => v.jailed).length;

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
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
            <span className="text-gray-500 text-sm">加载验证者数据...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6">
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

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">验证者列表</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                共 {filteredValidators.length} 个验证者
                {quickFilter !== 'all' && <span className="text-blue-600 ml-1">(已筛选)</span>}
                {' • 总质押 '}
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
                label="排名"
              />
              <SortButton
                field="tokens"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                label="质押量"
              />
              <SortButton
                field="commissionRate"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                label="佣金率"
              />
              <SortButton
                field="uptime"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                label="在线率"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 mr-1">状态:</span>
            <FilterButton
              status="all"
              currentStatus={filterStatus}
              onFilter={setFilterStatus}
              label="全部"
              count={validators.length}
            />
            <FilterButton
              status="active"
              currentStatus={filterStatus}
              onFilter={setFilterStatus}
              label="在线"
              count={activeCount}
            />
            <FilterButton
              status="jailed"
              currentStatus={filterStatus}
              onFilter={setFilterStatus}
              label="监禁"
              count={jailedCount}
            />
          </div>
        </div>

        <div className="px-5 py-3 bg-purple-50 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-purple-600 mr-1">快速筛选:</span>
            <button
              onClick={() => setQuickFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                quickFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-purple-200 text-purple-600 hover:bg-purple-100'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setQuickFilter('lowCommission')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                quickFilter === 'lowCommission'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-purple-200 text-purple-600 hover:bg-purple-100'
              }`}
            >
              低佣金 (&lt;5%)
            </button>
            <button
              onClick={() => setQuickFilter('highStake')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                quickFilter === 'highStake'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-purple-200 text-purple-600 hover:bg-purple-100'
              }`}
            >
              高质押 (Top 20%)
            </button>
            <button
              onClick={() => setQuickFilter('highUptime')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                quickFilter === 'highUptime'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-purple-200 text-purple-600 hover:bg-purple-100'
              }`}
            >
              高在线率 (≥99.9%)
            </button>
            {selectedValidatorAddresses.size > 0 && (
              <span className="ml-2 text-sm text-blue-600 font-medium">
                已选择 {selectedValidatorAddresses.size} 个验证者进行对比
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  验证者
                </th>
                <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  质押量
                </th>
                <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  佣金率
                </th>
                <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  在线率
                </th>
                <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
              </tr>
            </thead>
          </table>
          <div ref={parentRef} className="overflow-auto max-h-[500px] relative">
            <table className="w-full">
              <tbody className="block">
                {filteredValidators.length === 0 ? (
                  <tr className="hidden"></tr>
                ) : (
                  <tr className="block">
                    <td className="block p-0" style={{ height: virtualizer.getTotalSize() }}>
                      {virtualizer.getVirtualItems().map((virtualRow) => {
                        const validator = filteredValidators[virtualRow.index];
                        return (
                          <div
                            key={validator.operatorAddress}
                            className="absolute w-full"
                            style={{
                              height: virtualRow.size,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <ValidatorRow
                              validator={validator}
                              onClick={() => handleValidatorClick(validator)}
                              isSelected={selectedValidatorAddresses.has(validator.operatorAddress)}
                              onToggleSelect={(e) =>
                                handleToggleSelect(e, validator.operatorAddress)
                              }
                            />
                          </div>
                        );
                      })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredValidators.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>没有找到匹配的验证者</p>
            </div>
          )}
        </div>
      </div>

      {selectedValidatorsData.length > 0 && (
        <ValidatorComparison validators={selectedValidatorsData} />
      )}

      <ValidatorDetailModal
        validator={selectedValidator}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export type { ValidatorPanelProps, SortField, SortDirection, FilterStatus };
