import { Suspense } from 'react';

import SafetyCheckContent from './SafetyCheckContent';

export const metadata = {
  title: 'Position Stress Test - Insight',
  description:
    'Calculate position-specific oracle deviation and liquidation risk across supported lending protocols',
};

export default function SafetyCheckPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f7f4]" aria-busy="true" />}>
      <SafetyCheckContent />
    </Suspense>
  );
}
