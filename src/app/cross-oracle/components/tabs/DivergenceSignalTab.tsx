'use client';

import { DivergenceSignalTab } from '@/components/DivergenceSignalTab';
import type {
  DivergenceTimeSeries,
  OracleLeadership,
  DivergencePair,
} from '@/lib/analytics/divergenceSignals';

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface CrossOracleDivergenceSignalTabProps {
  timeSeries: DivergenceTimeSeries[];
  leadership: OracleLeadership[];
  divergenceMatrix: DivergencePair[][];
  alertCount: number;
  acceleratingCount: number;
  directionalBiasCount: number;
  leadingOracle: string | null;
  maxAcceleration: number;
}

export function CrossOracleDivergenceSignalTab({
  timeSeries,
  leadership,
  divergenceMatrix,
  alertCount,
  acceleratingCount,
  directionalBiasCount,
  leadingOracle,
  maxAcceleration,
}: CrossOracleDivergenceSignalTabProps) {
  return (
    <DivergenceSignalTab
      timeSeries={timeSeries}
      leadership={leadership}
      divergenceMatrix={divergenceMatrix}
      alertCount={alertCount}
      acceleratingCount={acceleratingCount}
      directionalBiasCount={directionalBiasCount}
      leadingEntity={leadingOracle}
      maxAcceleration={maxAcceleration}
      mode="oracle"
      getDisplayName={capitalize}
    />
  );
}
