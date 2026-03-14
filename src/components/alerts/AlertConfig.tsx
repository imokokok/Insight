'use client';

import { useState, useCallback } from 'react';
import { OracleProvider, Blockchain } from '@/types/oracle';
import { providerNames, chainNames, symbols, oracleColors, chainColors } from '@/lib/constants';
import { useCreateAlert, CreateAlertInput } from '@/hooks/useAlerts';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import type { AlertConditionType } from '@/lib/supabase/database.types';

interface AlertConfigProps {
  onAlertCreated?: () => void;
}

const CONDITION_OPTIONS: { value: AlertConditionType; label: string; description: string }[] = [
  { value: 'above', label: '高于', description: '当价格高于目标值时触发' },
  { value: 'below', label: '低于', description: '当价格低于目标值时触发' },
  { value: 'change_percent', label: '变化百分比', description: '当价格变化超过目标百分比时触发' },
];

export function AlertConfig({ onAlertCreated }: AlertConfigProps) {
  const [alertName, setAlertName] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('BTC');
  const [provider, setProvider] = useState<OracleProvider | ''>('');
  const [chain, setChain] = useState<Blockchain | ''>('');
  const [conditionType, setConditionType] = useState<AlertConditionType>('above');
  const [targetValue, setTargetValue] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { createAlert, isCreating } = useCreateAlert();

  const handleProviderChange = useCallback((value: OracleProvider | '') => {
    setProvider(value);
    if (value) {
      setChain('');
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const numericTarget = parseFloat(targetValue);
      if (isNaN(numericTarget) || numericTarget <= 0) {
        setError('请输入有效的目标值');
        return;
      }

      const input: CreateAlertInput = {
        name:
          alertName ||
          `${symbol} ${conditionType === 'above' ? '高于' : conditionType === 'below' ? '低于' : '变化'} ${numericTarget}`,
        symbol,
        provider: provider || null,
        chain: chain || null,
        condition_type: conditionType,
        target_value: numericTarget,
        is_active: isActive,
      };

      const { alert, error: createError } = await createAlert(input);

      if (createError) {
        setError(createError.message);
        return;
      }

      if (alert) {
        setTargetValue('');
        setError(null);
        onAlertCreated?.();
      }
    },
    [
      alertName,
      symbol,
      provider,
      chain,
      conditionType,
      targetValue,
      isActive,
      createAlert,
      onAlertCreated,
    ]
  );

  const getTargetPlaceholder = () => {
    switch (conditionType) {
      case 'above':
      case 'below':
        return '输入目标价格';
      case 'change_percent':
        return '输入百分比 (如: 5 表示 5%)';
      default:
        return '输入目标值';
    }
  };

  return (
    <DashboardCard title="创建价格告警">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">告警名称 (可选)</label>
          <input
            type="text"
            value={alertName}
            onChange={(e) => setAlertName(e.target.value)}
            placeholder="为告警起个名字"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">交易对</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">预言机 (可选)</label>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as OracleProvider | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">所有预言机</option>
            {Object.entries(providerNames).map(([key, name]) => (
              <option key={key} value={key}>
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: oracleColors[key as OracleProvider] }}
                />
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">链 (可选)</label>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value as Blockchain | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            disabled={!provider}
          >
            <option value="">{provider ? '所有链' : '请先选择预言机'}</option>
            {Object.entries(chainNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">告警条件</label>
          <div className="space-y-2">
            {CONDITION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                  conditionType === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="conditionType"
                  value={option.value}
                  checked={conditionType === option.value}
                  onChange={(e) => setConditionType(e.target.value as AlertConditionType)}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="font-medium text-gray-900">{option.label}</span>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">目标值</label>
          <input
            type="number"
            step="any"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={getTargetPlaceholder()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">启用告警</label>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isCreating}
          className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors ${
            isCreating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isCreating ? '创建中...' : '创建告警'}
        </button>
      </form>
    </DashboardCard>
  );
}
