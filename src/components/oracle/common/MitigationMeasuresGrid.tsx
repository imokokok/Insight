'use client';

import { useTranslations } from 'next-intl';
import { DashboardCard } from './DashboardCard';
import { getMeasureStatusColor } from '@/lib/utils/riskUtils';
import type { MitigationMeasure } from '@/types/risk';

export interface MitigationMeasuresGridProps {
  measures: MitigationMeasure[];
  className?: string;
}

export function MitigationMeasuresGrid({ measures, className = '' }: MitigationMeasuresGridProps) {
  const t = useTranslations();

  const getTypeLabel = (type: MitigationMeasure['type']) => {
    switch (type) {
      case 'technical':
        return t('oracleCommon.mitigationMeasures.types.technical');
      case 'governance':
        return t('oracleCommon.mitigationMeasures.types.governance');
      case 'operational':
        return t('oracleCommon.mitigationMeasures.types.operational');
      default:
        return type;
    }
  };

  const getTypeColor = (type: MitigationMeasure['type']) => {
    switch (type) {
      case 'technical':
        return 'bg-primary-100 text-primary-700';
      case 'governance':
        return 'bg-purple-100 text-purple-700';
      case 'operational':
        return 'bg-warning-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: MitigationMeasure['status']) => {
    switch (status) {
      case 'active':
        return t('oracleCommon.mitigationMeasures.status.active');
      case 'inactive':
        return t('oracleCommon.mitigationMeasures.status.inactive');
      default:
        return status;
    }
  };

  const getEffectivenessColor = (effectiveness: number) => {
    if (effectiveness >= 80) return 'bg-success-500';
    if (effectiveness >= 60) return 'bg-warning-500';
    return 'bg-danger-500';
  };

  const getEffectivenessLabel = (effectiveness: number) => {
    if (effectiveness >= 80) return t('oracleCommon.mitigationMeasures.effectiveness.high');
    if (effectiveness >= 60) return t('oracleCommon.mitigationMeasures.effectiveness.medium');
    return t('oracleCommon.mitigationMeasures.effectiveness.low');
  };

  return (
    <DashboardCard title={t('oracleCommon.mitigationMeasures.title')} className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {measures.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4 col-span-full">
            {t('oracleCommon.mitigationMeasures.noMeasures')}
          </p>
        ) : (
          measures.map((measure, index) => (
            <div
              key={index}
              className="border border-gray-200 p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900 flex-1 pr-2">
                  {t(measure.name as any, {
                    defaultValue: measure.name,
                  })}
                </h4>
                <span
                  className={`px-2 py-0.5 text-xs font-medium ${getMeasureStatusColor(measure.status)}`}
                >
                  {getStatusLabel(measure.status)}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 text-xs font-medium ${getTypeColor(measure.type)}`}>
                  {getTypeLabel(measure.type)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {t('oracleCommon.mitigationMeasures.effectivenessLabel')}
                  </span>
                  <span className="font-medium text-gray-700">{measure.effectiveness}%</span>
                </div>
                <div className="relative h-1.5 bg-gray-100 overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all duration-500 ${getEffectivenessColor(measure.effectiveness)}`}
                    style={{ width: `${measure.effectiveness}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {getEffectivenessLabel(measure.effectiveness)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardCard>
  );
}

export default MitigationMeasuresGrid;
