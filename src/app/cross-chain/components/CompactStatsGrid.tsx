'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';

import { CompactStatCard } from '@/components/ui';

import { type ChainStats } from '../constants';

interface CompactStatsGridProps {
  statsData: ChainStats[];
}

export function CompactStatsGrid({ statsData }: CompactStatsGridProps) {
  const [showAll, setShowAll] = useState(false);

  const coreIndices = [0, 1, 2, 3, 4, 11];

  const coreStats = coreIndices
    .map((index) => statsData[index])
    .filter((stat): stat is ChainStats => stat !== undefined);

  const extraStats = statsData.filter((_, index) => !coreIndices.includes(index));

  const displayStats = showAll ? [...coreStats, ...extraStats] : coreStats;

  return (
    <div id="stats" className="mb-6 pb-6 border-b border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Key Metrics</h3>
        <button
          onClick={() => setShowAll(!showAll)}
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 
                     bg-white border border-gray-300 rounded-md 
                     text-gray-600 transition-all duration-200
                     hover:bg-gray-50 hover:border-gray-400
                     active:bg-gray-100"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              View All
            </>
          )}
          <span className="ml-1 text-gray-400">
            ({coreStats.length}/{statsData.length})
          </span>
        </button>
      </div>

      <div
        className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 transition-all duration-300 ${
          showAll ? 'grid-rows-auto' : ''
        }`}
      >
        {displayStats.map((stat, index) => (
          <CompactStatCard
            key={`${stat.label}-${index}`}
            title={stat.label}
            value={stat.value}
            change={
              stat.trend !== null && stat.trend !== undefined
                ? {
                    value: stat.trend,
                    percentage: true,
                  }
                : undefined
            }
            breakdown={stat.subValue ? [{ label: 'Detail', value: stat.subValue }] : undefined}
            tooltip={stat.tooltip}
          />
        ))}
      </div>

      {showAll && extraStats.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Advanced Metrics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {extraStats.map((stat, index) => (
              <CompactStatCard
                key={`extra-${stat.label}-${index}`}
                title={stat.label}
                value={stat.value}
                change={
                  stat.trend !== null && stat.trend !== undefined
                    ? {
                        value: stat.trend,
                        percentage: true,
                      }
                    : undefined
                }
                breakdown={stat.subValue ? [{ label: 'Detail', value: stat.subValue }] : undefined}
                tooltip={stat.tooltip}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CompactStatsGrid;
