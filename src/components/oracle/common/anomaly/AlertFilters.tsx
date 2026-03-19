'use client';

import { useTranslations } from 'next-intl';
import { DropdownSelect } from '@/components/ui/selectors';
import { AnomalyType, AnomalySeverity, AnomalyFilter } from './types';

interface AlertFiltersProps {
  filter: AnomalyFilter;
  onFilterChange: (filter: AnomalyFilter) => void;
}

export function AlertFilters({ filter, onFilterChange }: AlertFiltersProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <DropdownSelect
        options={[
          { value: 'all', label: t('anomalyAlert.allTypes') },
          { value: 'price_spike', label: t('anomalyAlert.type_price_spike') },
          { value: 'price_deviation', label: t('anomalyAlert.type_price_deviation') },
          { value: 'data_delay', label: t('anomalyAlert.type_data_delay') },
          { value: 'price_drop', label: t('anomalyAlert.type_price_drop') },
        ]}
        value={filter.type}
        onChange={(value) => onFilterChange({ ...filter, type: value as AnomalyType | 'all' })}
      />

      <DropdownSelect
        options={[
          { value: 'all', label: t('anomalyAlert.allSeverities') },
          { value: 'high', label: t('anomalyAlert.severity_high') },
          { value: 'medium', label: t('anomalyAlert.severity_medium') },
          { value: 'low', label: t('anomalyAlert.severity_low') },
        ]}
        value={filter.severity}
        onChange={(value) => onFilterChange({ ...filter, severity: value as AnomalySeverity | 'all' })}
      />

      <DropdownSelect
        options={[
          { value: 'all', label: t('anomalyAlert.allStatus') },
          { value: 'false', label: t('anomalyAlert.unacknowledged') },
          { value: 'true', label: t('anomalyAlert.acknowledged') },
        ]}
        value={filter.acknowledged === 'all' ? 'all' : filter.acknowledged ? 'true' : 'false'}
        onChange={(value) =>
          onFilterChange({
            ...filter,
            acknowledged: value === 'all' ? 'all' : value === 'true',
          })
        }
      />
    </div>
  );
}
