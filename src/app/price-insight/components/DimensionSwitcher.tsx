'use client';

import { GitCompare, Link2 } from 'lucide-react';

export type Dimension = 'oracle' | 'chain';

interface DimensionSwitcherProps {
  dimension: Dimension;
  onDimensionChange: (dimension: Dimension) => void;
}

const DIMENSIONS = [
  {
    key: 'oracle' as Dimension,
    label: 'By Oracle',
    icon: GitCompare,
    description: 'Compare prices across oracle providers',
  },
  {
    key: 'chain' as Dimension,
    label: 'By Chain',
    icon: Link2,
    description: 'Compare prices across blockchains',
  },
];

export function DimensionSwitcher({ dimension, onDimensionChange }: DimensionSwitcherProps) {
  return (
    <div
      className="inline-flex p-1 rounded-xl bg-white border border-slate-200 shadow-sm"
      role="tablist"
      aria-label="Analysis dimension"
    >
      {DIMENSIONS.map(({ key, label, icon: Icon }) => {
        const isActive = dimension === key;
        return (
          <button
            key={key}
            onClick={() => onDimensionChange(key)}
            role="tab"
            aria-selected={isActive}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
