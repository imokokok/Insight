import { Suspense } from 'react';

import SafetyCheckContent from './SafetyCheckContent';

export const metadata = {
  title: 'Safety Check - Insight',
  description: 'Calculate your personal position critical deviation and liquidation risk',
};

export default function SafetyCheckPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f7f4]" aria-busy="true" />}>
      <SafetyCheckContent />
    </Suspense>
  );
}
