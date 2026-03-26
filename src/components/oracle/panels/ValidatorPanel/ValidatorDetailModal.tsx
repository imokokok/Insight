'use client';

import { useState, useEffect } from 'react';

import { StakingCalculator } from '@/components/oracle/data-display/StakingCalculator';
import { type BandProtocolClient, type ValidatorInfo } from '@/lib/oracles/bandProtocol';
import { formatNumber } from '@/lib/utils/format';

import { ValidatorHistoryChart } from '../../charts/ValidatorHistoryChart';

import { type TabType } from './config';

function useValidatorDetailModal(validator: ValidatorInfo | null, isOpen: boolean) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview');
    }
  }, [isOpen, validator?.operatorAddress]);

  return { activeTab, setActiveTab };
}

function ValidatorDetailModalContent({
  validator,
  onClose,
  client,
}: {
  validator: ValidatorInfo;
  onClose: () => void;
  client: BandProtocolClient;
}) {
  const { activeTab, setActiveTab } = useValidatorDetailModal(validator, true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 border border-gray-200 flex items-center justify-center rounded">
              <span className="text-gray-600 font-bold text-sm">#{validator.rank}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{validator.moniker}</h2>
              <p className="text-xs text-gray-500">验证者详情</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 transition-colors">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-gray-100">
          <div className="flex items-center gap-1 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              概览
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              历史趋势
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'calculator'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              收益计算
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">质押量</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNumber(validator.tokens, true)} BAND
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    约 ${formatNumber(validator.tokens * 2.5, true)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">佣金率</p>
                  <p className="text-xl font-bold text-gray-900">
                    {(validator.commissionRate * 100).toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    最大 {(validator.maxCommissionRate * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-gray-50 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">在线率</p>
                  <p className="text-xl font-bold text-success-600">
                    {validator.uptime.toFixed(2)}%
                  </p>
                  <div className="mt-2 h-2 bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-success-500 transition-all duration-500"
                      style={{ width: `${validator.uptime}%` }}
                    />
                  </div>
                </div>
                <div className="bg-gray-50 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">状态</p>
                  <div className="flex items-center gap-2">
                    <span className={`relative flex h-3 w-3`}>
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full ${validator.jailed ? 'bg-red-400' : 'bg-green-400'} opacity-75`}
                      />
                      <span
                        className={`relative inline-flex h-3 w-3 ${validator.jailed ? 'bg-danger-500' : 'bg-success-500'}`}
                      />
                    </span>
                    <span
                      className={`text-lg font-bold ${validator.jailed ? 'text-danger-600' : 'text-success-600'}`}
                    >
                      {validator.jailed ? '监禁中' : '活跃'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">验证者信息</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">操作地址</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 text-gray-700 max-w-[200px] truncate">
                        {validator.operatorAddress}
                      </code>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">身份标识</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 text-gray-700">
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
                          className="text-sm text-primary-600 hover:underline"
                        >
                          {validator.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {validator.details && (
                  <div className="border border-gray-200 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">描述</p>
                    <p className="text-sm text-gray-700">{validator.details}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">历史趋势分析</h3>
                <p className="text-xs text-gray-500">
                  查看验证者过去 7/30/90 天的在线率、质押量和佣金率变化趋势
                </p>
              </div>
              <ValidatorHistoryChart
                client={client}
                validatorAddress={validator.operatorAddress}
                height={400}
                showToolbar={true}
              />
            </div>
          )}

          {activeTab === 'calculator' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">质押收益计算器</h3>
                <p className="text-xs text-gray-500">输入质押金额，计算预期收益</p>
              </div>
              <StakingCalculator />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ValidatorDetailModal({
  validator,
  isOpen,
  onClose,
  client,
}: {
  validator: ValidatorInfo | null;
  isOpen: boolean;
  onClose: () => void;
  client: BandProtocolClient;
}) {
  if (!isOpen || !validator) return null;

  return (
    <ValidatorDetailModalContent
      key={validator.operatorAddress}
      validator={validator}
      onClose={onClose}
      client={client}
    />
  );
}
