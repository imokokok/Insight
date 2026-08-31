'use client';

import type { ReactNode } from 'react';

import { pegMonitorConfigs } from './pegMonitorConfigs';
import { RiskTrackerLayout } from './RiskTrackerLayout';

export interface PegMonitorConfig<T> {
  page: 'stablecoin' | 'wrapped';
  title: string;
  description: string;
  apiEndpoint: string;
  thresholds: { warning: number; critical: number; severe: number };
  heroIcon: ReactNode;
  heroEyebrow?: string;
  typeLabels?: Record<string, string>;
  getAssetSubtext?: (snapshot: T) => ReactNode;
  getDeviationValue: (snapshot: T) => number;
  getReferencePrice: (snapshot: T) => number;
  renderOverview: (snapshot: T) => ReactNode;
}

/**
 * Single implementation behind both peg-tracker routes. The two pages differ
 * only by configuration (data source, thresholds, overview copy), which lives
 * in `pegMonitorConfigs`. Adding a third peg category is now config-only.
 */
export function PegMonitorContent({
  kind,
  initialSnapshots = [],
}: {
  kind: 'stablecoin' | 'wrapped';
  initialSnapshots?: unknown[];
}) {
  if (kind === 'stablecoin') {
    return (
      <RiskTrackerLayout
        {...pegMonitorConfigs.stablecoin}
        initialSnapshots={initialSnapshots as never[]}
      />
    );
  }
  return (
    <RiskTrackerLayout
      {...pegMonitorConfigs.wrapped}
      initialSnapshots={initialSnapshots as never[]}
    />
  );
}
