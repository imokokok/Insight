'use client';

import { PythRiskAssessmentPanel } from '@/components/oracle/panels/PythRiskAssessmentPanel';
import { PythRiskViewProps } from '../types';

export function PythRiskView({ isLoading }: PythRiskViewProps) {
  return (
    <div className="space-y-4">
      <PythRiskAssessmentPanel />
    </div>
  );
}
