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
      className="inline-flex p-1 rounded-lg bg-gray-100"
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
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
