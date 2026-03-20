'use client';

import { useState } from 'react';
import { DashboardCard } from '../common/DashboardCard';
import type { ValidatorData } from '@/lib/oracles/uma';
import { useTranslations } from 'next-intl';
import { chartColors } from '@/lib/config/colors';
import { formatNumber } from '@/lib/utils/format';

type ComparisonDimension = 'responseTime' | 'successRate' | 'earnings';

export interface ValidatorComparisonProps {
  validators: ValidatorData[];
}

function ResponseTimeComparison({ validators }: { validators: ValidatorData[] }) {
  const t = useTranslations();
  const maxResponseTime = Math.max(...validators.map((v) => v.responseTime));

  return (
    <DashboardCard title={t('uma.validatorComparison.responseTimeComparison')}>
      <div className="space-y-3">
        {validators.map((validator, index) => {
          const width = (validator.responseTime / maxResponseTime) * 100;

          return (
            <div key={validator.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate">{validator.name}</span>
                <span className="font-semibold text-gray-900">{validator.responseTime}ms</span>
              </div>
              <div className="h-6 bg-gray-100  overflow-hidden">
                <div
                  className="h-full  transition-all duration-500 flex items-center justify-end pr-2"
                  style={{
                    width: `${width}%`,
                    backgroundColor: chartColors.sequence[index % chartColors.sequence.length],
                  }}
                >
                  {width > 20 && (
                    <span className="text-xs text-white font-medium">
                      {validator.responseTime}ms
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

function SuccessRateRadarChart({ validators }: { validators: ValidatorData[] }) {
  const t = useTranslations();

  const dimensions = [
    { key: 'successRate', label: t('uma.validatorAnalytics.successRate'), max: 100 },
    { key: 'reputation', label: t('uma.validatorAnalytics.reputation'), max: 100 },
    {
      key: 'responseTime',
      label: t('uma.validatorAnalytics.responseTime'),
      max: 200,
      inverse: true,
    },
  ];

  const centerX = 150;
  const centerY = 150;
  const radius = 100;

  const getPointPosition = (value: number, max: number, angle: number, inverse?: boolean) => {
    const normalizedValue = inverse ? 1 - value / max : value / max;
    const x = centerX + radius * normalizedValue * Math.cos(angle - Math.PI / 2);
    const y = centerY + radius * normalizedValue * Math.sin(angle - Math.PI / 2);
    return { x, y };
  };

  return (
    <DashboardCard title={t('uma.validatorComparison.successRateRadar')}>
      <div className="flex items-center justify-center">
        <svg viewBox="0 0 300 300" className="w-full max-w-md">
          {[0.25, 0.5, 0.75, 1].map((scale, i) => (
            <polygon
              key={i}
              points={dimensions
                .map((_, j) => {
                  const angle = (j / dimensions.length) * 2 * Math.PI;
                  const x = centerX + radius * scale * Math.cos(angle - Math.PI / 2);
                  const y = centerY + radius * scale * Math.sin(angle - Math.PI / 2);
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke={chartColors.recharts.grid}
              strokeWidth="1"
            />
          ))}

          {dimensions.map((dim, i) => {
            const angle = (i / dimensions.length) * 2 * Math.PI;
            const x = centerX + (radius + 20) * Math.cos(angle - Math.PI / 2);
            const y = centerY + (radius + 20) * Math.sin(angle - Math.PI / 2);
            return (
              <text
                key={dim.key}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-gray-600"
              >
                {dim.label}
              </text>
            );
          })}

          {validators.map((validator, vIndex) => {
            const points = dimensions
              .map((dim, dIndex) => {
                const angle = (dIndex / dimensions.length) * 2 * Math.PI;
                const pos = getPointPosition(
                  validator[dim.key as keyof ValidatorData] as number,
                  dim.max,
                  angle,
                  dim.inverse
                );
                return `${pos.x},${pos.y}`;
              })
              .join(' ');

            return (
              <polygon
                key={validator.id}
                points={points}
                fill={chartColors.sequence[vIndex % chartColors.sequence.length]}
                fillOpacity="0.2"
                stroke={chartColors.sequence[vIndex % chartColors.sequence.length]}
                strokeWidth="2"
              />
            );
          })}

          {validators.map((validator, vIndex) => {
            return dimensions.map((dim, dIndex) => {
              const angle = (dIndex / dimensions.length) * 2 * Math.PI;
              const pos = getPointPosition(
                validator[dim.key as keyof ValidatorData] as number,
                dim.max,
                angle,
                dim.inverse
              );
              return (
                <circle
                  key={`${validator.id}-${dim.key}`}
                  cx={pos.x}
                  cy={pos.y}
                  r="4"
                  fill={chartColors.sequence[vIndex % chartColors.sequence.length]}
                />
              );
            });
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
        {validators.map((validator, index) => (
          <div key={validator.id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 "
              style={{ backgroundColor: chartColors.sequence[index % chartColors.sequence.length] }}
            />
            <span className="text-sm text-gray-600">{validator.name}</span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

function EarningsComparisonChart({ validators }: { validators: ValidatorData[] }) {
  const t = useTranslations();
  const maxEarnings = Math.max(...validators.map((v) => v.earnings));

  return (
    <DashboardCard title={t('uma.validatorComparison.earningsComparison')}>
      <div className="space-y-4">
        {validators.map((validator, index) => {
          const width = (validator.earnings / maxEarnings) * 100;

          return (
            <div key={validator.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate">{validator.name}</span>
                <span className="font-semibold text-success-600">
                  {formatNumber(validator.earnings, true)} UMA
                </span>
              </div>
              <div className="h-8 bg-gray-100  overflow-hidden">
                <div
                  className="h-full  transition-all duration-500 flex items-center justify-end pr-3"
                  style={{
                    width: `${width}%`,
                    backgroundColor: chartColors.sequence[index % chartColors.sequence.length],
                  }}
                >
                  {width > 15 && (
                    <span className="text-xs text-white font-medium">
                      {formatNumber(validator.earnings, true)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

export function ValidatorComparison({ validators }: ValidatorComparisonProps) {
  const t = useTranslations();
  const [selectedValidators, setSelectedValidators] = useState<string[]>([]);
  const [dimension, setDimension] = useState<ComparisonDimension>('responseTime');

  const toggleValidator = (id: string) => {
    setSelectedValidators((prev) => {
      if (prev.includes(id)) {
        return prev.filter((v) => v !== id);
      }
      if (prev.length < 4) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const selectTop3 = () => {
    const sortedByReputation = [...validators].sort((a, b) => b.reputation - a.reputation);
    const top3Ids = sortedByReputation.slice(0, 3).map((v) => v.id);
    setSelectedValidators(top3Ids);
  };

  const selectRandom = () => {
    const shuffled = [...validators].sort(() => Math.random() - 0.5);
    const randomIds = shuffled.slice(0, 4).map((v) => v.id);
    setSelectedValidators(randomIds);
  };

  const comparedValidators = validators.filter((v) => selectedValidators.includes(v.id));

  return (
    <div className="space-y-6">
      <DashboardCard title={t('uma.validatorComparison.selectValidators')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('uma.validatorComparison.selectHint')}</p>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {t('uma.validatorComparison.quickSelect')}:
            </span>
            <button
              onClick={selectTop3}
              className="px-3 py-1.5 text-sm  bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              Top 3
            </button>
            <button
              onClick={selectRandom}
              className="px-3 py-1.5 text-sm  bg-success-600 text-white hover:bg-success-700 transition-colors"
            >
              {t('uma.validatorComparison.randomSelect')}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {validators.slice(0, 10).map((validator) => {
              const isSelected = selectedValidators.includes(validator.id);
              const isDisabled = !isSelected && selectedValidators.length >= 4;

              return (
                <button
                  key={validator.id}
                  onClick={() => toggleValidator(validator.id)}
                  disabled={isDisabled}
                  className={`px-3 py-2 text-sm  border transition-all ${
                    isSelected
                      ? 'bg-primary-600 text-white border-primary-600'
                      : isDisabled
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                  }`}
                >
                  {validator.name}
                </button>
              );
            })}
          </div>

          {selectedValidators.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{t('uma.validatorComparison.selected')}:</span>
              <span className="font-semibold text-primary-600">{selectedValidators.length}</span>
              <span>/ 4</span>
            </div>
          )}
        </div>
      </DashboardCard>

      {comparedValidators.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('uma.validatorComparison.viewMode')}:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDimension('responseTime')}
                className={`px-3 py-1.5 text-sm  transition-colors ${
                  dimension === 'responseTime'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('uma.validatorAnalytics.responseTime')}
              </button>
              <button
                onClick={() => setDimension('successRate')}
                className={`px-3 py-1.5 text-sm  transition-colors ${
                  dimension === 'successRate'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('uma.validatorAnalytics.successRate')}
              </button>
              <button
                onClick={() => setDimension('earnings')}
                className={`px-3 py-1.5 text-sm  transition-colors ${
                  dimension === 'earnings'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('uma.validatorAnalytics.earnings')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dimension === 'responseTime' && (
              <ResponseTimeComparison validators={comparedValidators} />
            )}
            {dimension === 'successRate' && (
              <SuccessRateRadarChart validators={comparedValidators} />
            )}
            {dimension === 'earnings' && (
              <EarningsComparisonChart validators={comparedValidators} />
            )}

            <DashboardCard title={t('uma.validatorComparison.detailedComparison')}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">
                        {t('uma.validatorAnalytics.validatorName')}
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">
                        {t('uma.validatorAnalytics.responseTime')}
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">
                        {t('uma.validatorAnalytics.successRate')}
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">
                        {t('uma.validatorAnalytics.reputation')}
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">
                        {t('uma.validatorAnalytics.earnings')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparedValidators.map((validator) => (
                      <tr key={validator.id} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-sm text-gray-900">{validator.name}</td>
                        <td className="py-2 px-3 text-sm text-right text-gray-900">
                          {validator.responseTime}ms
                        </td>
                        <td className="py-2 px-3 text-sm text-right text-gray-900">
                          {validator.successRate}%
                        </td>
                        <td className="py-2 px-3 text-sm text-right text-gray-900">
                          {validator.reputation}
                        </td>
                        <td className="py-2 px-3 text-sm text-right font-semibold text-success-600">
                          {formatNumber(validator.earnings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          </div>
        </>
      )}
    </div>
  );
}
