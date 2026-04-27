'use client';

import { CompactStatCard } from '@/components/ui';

import { type ChainStats } from '../constants';

interface CompactStatsGridProps {
  statsData: ChainStats[];
}

export function CompactStatsGrid({ statsData }: CompactStatsGridProps) {
  return (
    <div id="stats" className="mb-6 pb-6 border-b border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Key Metrics</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statsData.map((stat, index) => (
          <CompactStatCard
            key={`${stat.label}-${index}`}
            title={stat.label}
            value={stat.value}
            breakdown={stat.subValue ? [{ label: 'Detail', value: stat.subValue }] : undefined}
            tooltip={stat.tooltip}
          />
        ))}
      </div>
    </div>
  );
}
