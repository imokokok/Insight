'use client';

import { DivergenceSignalTab } from '@/components/DivergenceSignalTab';
import type {
  DivergenceTimeSeries,
  OracleLeadership,
  DivergencePair,
} from '@/lib/analytics/divergenceSignals';
import { capitalize } from '@/lib/utils/format';

interface CrossOracleDivergenceSignalTabProps {
  timeSeries: DivergenceTimeSeries[];
  leadership: OracleLeadership[];
  divergenceMatrix: DivergencePair[][];
  acceleratingCount: number;
  directionalBiasCount: number;
  leadingOracle: string | null;
  maxAcceleration: number;
}

export function CrossOracleDivergenceSignalTab({
  timeSeries,
  leadership,
  divergenceMatrix,
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
      acceleratingCount={acceleratingCount}
      directionalBiasCount={directionalBiasCount}
      leadingEntity={leadingOracle}
      maxAcceleration={maxAcceleration}
      mode="oracle"
      getDisplayName={capitalize}
    />
  );
}
