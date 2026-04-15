'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

import { chartColors } from '@/lib/config/colors';

interface DispersionGaugeProps {
  cv: number;
  size?: number;
}

function getDispersionInterpretation(cv: number, t: ReturnType<typeof useTranslations>) {
  if (cv < 0.1) {
    return {
      label: t('crossOracle.dispersion.highlyConsistent'),
      color: chartColors.recharts.success,
      description: t('crossOracle.dispersion.highlyConsistentDesc'),
    };
  }
  if (cv < 0.5) {
    return {
      label: t('crossOracle.dispersion.basicallyConsistent'),
      color: chartColors.recharts.primary,
      description: t('crossOracle.dispersion.basicallyConsistentDesc'),
    };
  }
  if (cv < 1.0) {
    return {
      label: t('crossOracle.dispersion.someDivergence'),
      color: chartColors.recharts.warning,
      description: t('crossOracle.dispersion.someDivergenceDesc'),
    };
  }
  return {
    label: t('crossOracle.dispersion.severeDivergence'),
    color: chartColors.recharts.danger,
    description: t('crossOracle.dispersion.severeDivergenceDesc'),
  };
}

function DispersionGaugeComponent({ cv, size = 120 }: DispersionGaugeProps) {
  const t = useTranslations();
  const interpretation = getDispersionInterpretation(cv, t);
  const maxCV = 2.0;
  const normalizedCV = Math.min(cv, maxCV);
  const percentage = (normalizedCV / maxCV) * 100;

  const data = [
    { name: 'dispersion', value: percentage },
    { name: 'empty', value: 100 - percentage },
  ];

  return (
    <div className="flex items-center gap-4">
      <div style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={size * 0.35}
              outerRadius={size * 0.5}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={interpretation.color} />
              <Cell fill={chartColors.recharts.grid} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          className="flex flex-col items-center justify-center"
          style={{
            marginTop: -size * 0.65,
            height: size * 0.5,
          }}
        >
          <span className="text-lg font-bold text-gray-900">{cv.toFixed(2)}%</span>
          <span className="text-xs text-gray-500">CV</span>
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: interpretation.color }} />
          <span className="font-medium text-gray-900">{interpretation.label}</span>
        </div>
        <p className="text-xs text-gray-500">{interpretation.description}</p>
        <div className="mt-2 text-xs text-gray-400">{t('crossOracle.dispersion.cvFormula')}</div>
      </div>
    </div>
  );
}

export const DispersionGauge = memo(DispersionGaugeComponent);
DispersionGauge.displayName = 'DispersionGauge';

export default DispersionGauge;
