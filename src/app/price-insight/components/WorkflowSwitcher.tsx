'use client';

import { BarChart3, SearchCheck, ShieldCheck } from 'lucide-react';

export type WorkflowStage = 'observe' | 'compare' | 'assess';

interface WorkflowSwitcherProps {
  stage: WorkflowStage;
  onStageChange: (stage: WorkflowStage) => void;
}

const STAGES = [
  {
    key: 'observe' as WorkflowStage,
    number: '01',
    label: 'Observe',
    icon: SearchCheck,
    description: 'Inspect one source record',
  },
  {
    key: 'compare' as WorkflowStage,
    number: '02',
    label: 'Compare',
    icon: BarChart3,
    description: 'Test agreement and divergence',
  },
  {
    key: 'assess' as WorkflowStage,
    number: '03',
    label: 'Assess',
    icon: ShieldCheck,
    description: 'Read the risk signals',
  },
] as const;

export function WorkflowSwitcher({ stage, onStageChange }: WorkflowSwitcherProps) {
  return (
    <div
      className="flex max-w-full overflow-x-auto border border-slate-300 bg-white"
      role="tablist"
      aria-label="Oracle evidence workflow"
    >
      {STAGES.map(({ key, number, label, icon: Icon, description }) => {
        const isActive = stage === key;

        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={description}
            onClick={() => onStageChange(key)}
            className={`flex min-h-12 min-w-max items-center gap-2 border-r border-slate-900/15 px-3.5 py-2 text-left text-sm font-semibold transition-colors last:border-r-0 sm:px-4 ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <span
              className={`font-mono text-[10px] ${isActive ? 'text-blue-100' : 'text-slate-400'}`}
            >
              {number}
            </span>
            <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
