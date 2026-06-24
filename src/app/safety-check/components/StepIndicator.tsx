'use client';

import { useEffect, useState } from 'react';

import { motion } from 'framer-motion';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  isCalculating: boolean;
  hasResult: boolean;
  hasError: boolean;
}

interface Phase {
  id: number;
  label: string;
}

const PHASES: Phase[] = [
  { id: 1, label: 'Prepare Position' },
  { id: 2, label: 'Fetch Market Data' },
  { id: 3, label: 'Compute Deviation' },
  { id: 4, label: 'Generate Report' },
];

const PHASE_INTERVAL_MS = 900;

export function StepIndicator({ isCalculating, hasResult, hasError }: StepIndicatorProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isCalculating) return;
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, PHASE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isCalculating]);

  const activeIndex = hasResult ? PHASES.length : isCalculating ? tick % PHASES.length : 0;
  const progressWidth = isCalculating
    ? `${((activeIndex + 1) / PHASES.length) * 100}%`
    : hasResult || hasError
      ? '100%'
      : '0%';

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-gray-900">Calculation Process</span>
        <StatusBadge isCalculating={isCalculating} hasResult={hasResult} hasError={hasError} />
      </div>

      <div className="relative">
        <div className="flex items-center justify-between relative z-10">
          {PHASES.map((phase, index) => {
            const isCompleted = hasResult || (!isCalculating && index < activeIndex);
            const isCurrent = isCalculating && index === activeIndex;
            const isError = hasError && !isCalculating && index === activeIndex - 1;

            return (
              <div key={phase.id} className="flex flex-col items-center flex-1">
                <motion.div
                  initial={false}
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors duration-300',
                    isCompleted && 'bg-primary-600 border-primary-600 text-white',
                    isCurrent && 'bg-white border-primary-600 text-primary-600',
                    isError && 'bg-white border-red-500 text-red-500',
                    !isCompleted &&
                      !isCurrent &&
                      !isError &&
                      'bg-white border-gray-200 text-gray-400'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isError ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    phase.id
                  )}
                </motion.div>
                <span
                  className={cn(
                    'text-[10px] mt-1.5 font-medium text-center transition-colors duration-300 leading-tight',
                    isCompleted && 'text-primary-600',
                    (isCurrent || isError) && 'text-gray-900',
                    !isCompleted && !isCurrent && !isError && 'text-gray-400'
                  )}
                >
                  {phase.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-0">
          <motion.div
            className={cn('h-full rounded-full', hasError ? 'bg-red-500' : 'bg-primary-600')}
            initial={false}
            animate={{ width: progressWidth }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  isCalculating,
  hasResult,
  hasError,
}: {
  isCalculating: boolean;
  hasResult: boolean;
  hasError: boolean;
}) {
  if (isCalculating) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-primary-600">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Calculating...
      </span>
    );
  }

  if (hasError) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
        <AlertCircle className="w-3.5 h-3.5" />
        Failed
      </span>
    );
  }

  if (hasResult) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <Check className="w-3.5 h-3.5" />
        Complete
      </span>
    );
  }

  return <span className="text-xs font-medium text-gray-400">Ready</span>;
}
