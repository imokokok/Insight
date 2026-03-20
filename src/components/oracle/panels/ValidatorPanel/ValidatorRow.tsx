'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslations } from 'next-intl';
import { ValidatorInfo } from '@/lib/oracles/bandProtocol';
import { formatNumber } from '@/lib/utils/format';
import { SortField, SortDirection, FilterStatus, statusConfig } from './config';

export function SortButton({
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
      className={`flex items-center gap-1 px-3 py-1.5  text-xs font-medium transition-all ${
        isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
          <path strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )}
    </button>
  );
}

export function FilterButton({
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
      className={`flex items-center gap-2 px-3 py-1.5  text-xs font-medium transition-all ${
        isActive
          ? 'bg-primary-600 text-white'
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className={`px-1.5 py-0.5  text-[10px] ${isActive ? 'bg-primary-500' : 'bg-gray-200'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

export function ValidatorRow({
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
  const t = useTranslations();
  const status = validator.jailed ? 'jailed' : 'active';
  const config = statusConfig[status];

  return (
    <tr className="group cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSelect}
            className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${
              isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300 hover:border-primary-400'
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
            className="w-8 h-8 bg-gray-100 border border-gray-200 flex items-center justify-center"
            onClick={onClick}
          >
            <span className="text-gray-600 font-bold text-xs">#{validator.rank}</span>
          </div>
          <div onClick={onClick}>
            <p className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
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
          <div className="flex-1 h-2 bg-gray-200 overflow-hidden max-w-[80px]">
            <div
              className={`h-full transition-all duration-500 ${
                validator.uptime >= 99.5
                  ? 'bg-success-500'
                  : validator.uptime >= 99
                    ? 'bg-warning-500'
                    : 'bg-danger-500'
              }`}
              style={{ width: `${Math.min(validator.uptime, 100)}%` }}
            />
          </div>
          <span
            className={`text-sm font-medium ${
              validator.uptime >= 99.5
                ? 'text-success-600'
                : validator.uptime >= 99
                  ? 'text-warning-600'
                  : 'text-danger-600'
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
              className={`animate-ping absolute inline-flex h-full w-full ${config.bgColor} opacity-75`}
            />
            <span className={`relative inline-flex h-2.5 w-2.5 ${config.bgColor}`} />
          </span>
          <span className={`text-sm font-medium ${config.textColor}`}>{t(config.labelKey)}</span>
        </div>
      </td>
      <td className="py-4 px-4" onClick={onClick}>
        <svg
          className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </td>
    </tr>
  );
}

export function ValidatorCard({
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
  const t = useTranslations();
  const status = validator.jailed ? 'jailed' : 'active';
  const config = statusConfig[status];

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 p-4 cursor-pointer hover:border-primary-300 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSelect}
            className={`w-5 h-5 border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300 hover:border-primary-400'
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
          <div className="w-10 h-10 bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
            <span className="text-gray-600 font-bold text-sm">#{validator.rank}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{validator.moniker}</p>
            <p className="text-xs text-gray-400 truncate max-w-[140px]">
              {validator.operatorAddress.slice(0, 16)}...
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`relative flex h-2.5 w-2.5`}>
            <span
              className={`animate-ping absolute inline-flex h-full w-full ${config.bgColor} opacity-75`}
            />
            <span className={`relative inline-flex h-2.5 w-2.5 ${config.bgColor}`} />
          </span>
          <span className={`text-xs font-medium ${config.textColor}`}>{t(config.labelKey)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 p-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">质押量</p>
          <p className="text-sm font-bold text-gray-900 truncate">
            {formatNumber(validator.tokens, true)}
          </p>
          <p className="text-[10px] text-gray-400">BAND</p>
        </div>
        <div className="bg-gray-50 p-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">佣金率</p>
          <p className="text-sm font-bold text-gray-900">
            {(validator.commissionRate * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 h-1.5 bg-gray-200 overflow-hidden max-w-[100px]">
            <div
              className={`h-full transition-all duration-500 ${
                validator.uptime >= 99.5
                  ? 'bg-success-500'
                  : validator.uptime >= 99
                    ? 'bg-warning-500'
                    : 'bg-danger-500'
              }`}
              style={{ width: `${Math.min(validator.uptime, 100)}%` }}
            />
          </div>
          <span
            className={`text-xs font-medium ${
              validator.uptime >= 99.5
                ? 'text-success-600'
                : validator.uptime >= 99
                  ? 'text-warning-600'
                  : 'text-danger-600'
            }`}
          >
            {validator.uptime.toFixed(1)}%
          </span>
        </div>
        <svg
          className="w-5 h-5 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

export function MobileValidatorList({
  validators,
  onValidatorClick,
  selectedValidatorAddresses,
  onToggleSelect,
}: {
  validators: ValidatorInfo[];
  onValidatorClick: (validator: ValidatorInfo) => void;
  selectedValidatorAddresses: Set<string>;
  onToggleSelect: (e: React.MouseEvent, address: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowHeight = 140;

  const virtualizer = useVirtualizer({
    count: validators.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 3,
  });

  if (validators.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p>没有找到匹配的验证者</p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="overflow-auto max-h-[600px] relative">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const validator = validators[virtualRow.index];
          return (
            <div
              key={validator.operatorAddress}
              className="absolute w-full px-4 py-2"
              style={{
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ValidatorCard
                validator={validator}
                onClick={() => onValidatorClick(validator)}
                isSelected={selectedValidatorAddresses.has(validator.operatorAddress)}
                onToggleSelect={(e) => onToggleSelect(e, validator.operatorAddress)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DesktopValidatorTable({
  validators,
  onValidatorClick,
  selectedValidatorAddresses,
  onToggleSelect,
}: {
  validators: ValidatorInfo[];
  onValidatorClick: (validator: ValidatorInfo) => void;
  selectedValidatorAddresses: Set<string>;
  onToggleSelect: (e: React.MouseEvent, address: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowHeight = 64;

  const virtualizer = useVirtualizer({
    count: validators.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  return (
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
          <tbody style={{ display: 'block' }}>
            {validators.length === 0 ? (
              <tr style={{ display: 'none' }}></tr>
            ) : (
              <tr style={{ display: 'block' }}>
                <td style={{ display: 'block', padding: 0, height: virtualizer.getTotalSize() }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const validator = validators[virtualRow.index];
                    return (
                      <tr
                        key={validator.operatorAddress}
                        style={{
                          display: 'block',
                          position: 'absolute',
                          width: '100%',
                          height: virtualRow.size,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <td style={{ display: 'block', padding: 0 }}>
                          <ValidatorRow
                            validator={validator}
                            onClick={() => onValidatorClick(validator)}
                            isSelected={selectedValidatorAddresses.has(validator.operatorAddress)}
                            onToggleSelect={(e) => onToggleSelect(e, validator.operatorAddress)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {validators.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>没有找到匹配的验证者</p>
        </div>
      )}
    </div>
  );
}
