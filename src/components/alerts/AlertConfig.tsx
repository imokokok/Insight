'use client';

import { useState, useCallback, useMemo } from 'react';
import { OracleProvider, Blockchain } from '@/types/oracle';
import { providerNames, chainNames, symbols, oracleColors, chainColors } from '@/lib/constants';
import { useCreateAlert, CreateAlertInput } from '@/hooks/useAlerts';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import type { AlertConditionType } from '@/lib/supabase/database.types';
import { useI18n } from '@/lib/i18n/provider';

interface AlertConfigProps {
  onAlertCreated?: () => void;
}

export function AlertConfig({ onAlertCreated }: AlertConfigProps) {
  const { t } = useI18n();
  const [alertName, setAlertName] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('BTC');
  const [provider, setProvider] = useState<OracleProvider | ''>('');
  const [chain, setChain] = useState<Blockchain | ''>('');
  const [conditionType, setConditionType] = useState<AlertConditionType>('above');
  const [targetValue, setTargetValue] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { createAlert, isCreating } = useCreateAlert();

  const CONDITION_OPTIONS: { value: AlertConditionType; label: string; description: string }[] =
    useMemo(
      () => [
        {
          value: 'above',
          label: t('alerts.condition.above'),
          description: t('alerts.condition.aboveDesc'),
        },
        {
          value: 'below',
          label: t('alerts.condition.below'),
          description: t('alerts.condition.belowDesc'),
        },
        {
          value: 'change_percent',
          label: t('alerts.condition.changePercent'),
          description: t('alerts.condition.changePercentDesc'),
        },
      ],
      [t]
    );

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
        setError(t('alerts.error.invalidTargetValue'));
        return;
      }

      const conditionLabel =
        conditionType === 'above'
          ? t('alerts.condition.above')
          : conditionType === 'below'
            ? t('alerts.condition.below')
            : t('alerts.condition.changePercent');

      const input: CreateAlertInput = {
        name: alertName || `${symbol} ${conditionLabel} ${numericTarget}`,
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
      t,
    ]
  );

  const getTargetPlaceholder = useCallback(() => {
    switch (conditionType) {
      case 'above':
      case 'below':
        return t('alerts.placeholder.targetPrice');
      case 'change_percent':
        return t('alerts.placeholder.percentage');
      default:
        return t('alerts.placeholder.targetValue');
    }
  }, [conditionType, t]);

  return (
    <DashboardCard title={t('alerts.create.title')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('alerts.create.nameLabel')}{' '}
            <span className="text-gray-400">{t('alerts.create.nameOptional')}</span>
          </label>
          <input
            type="text"
            value={alertName}
            onChange={(e) => setAlertName(e.target.value)}
            placeholder={t('alerts.create.namePlaceholder')}
            className="w-full px-3 py-2 border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('alerts.create.symbolLabel')}
          </label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('alerts.create.providerLabel')}{' '}
            <span className="text-gray-400">{t('alerts.create.providerOptional')}</span>
          </label>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as OracleProvider | '')}
            className="w-full px-3 py-2 border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">{t('alerts.create.allProviders')}</option>
            {Object.entries(providerNames).map(([key, name]) => (
              <option key={key} value={key}>
                <span
                  className="inline-block w-2 h-2  mr-2"
                  style={{ backgroundColor: oracleColors[key as OracleProvider] }}
                />
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('alerts.create.chainLabel')}{' '}
            <span className="text-gray-400">{t('alerts.create.chainOptional')}</span>
          </label>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value as Blockchain | '')}
            className="w-full px-3 py-2 border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            disabled={!provider}
          >
            <option value="">
              {provider ? t('alerts.create.allChains') : t('alerts.create.selectProviderFirst')}
            </option>
            {Object.entries(chainNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('alerts.create.conditionLabel')}
          </label>
          <div className="space-y-2">
            {CONDITION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start p-3 border  cursor-pointer transition-colors ${
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('alerts.create.targetValueLabel')}
          </label>
          <input
            type="number"
            step="any"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={getTargetPlaceholder()}
            className="w-full px-3 py-2 border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            {t('alerts.create.enableAlert')}
          </label>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 items-center  transition-colors ${
              isActive ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform  bg-white transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200  text-sm text-red-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={isCreating}
          className={`w-full py-2 px-4  font-medium text-white transition-colors ${
            isCreating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isCreating ? t('alerts.create.submitting') : t('alerts.create.submit')}
        </button>
      </form>
    </DashboardCard>
  );
}
