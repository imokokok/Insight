'use client';

import { ErrorBoundary } from '@/components/error-boundary';
import DashboardContent from '@/components/home/DashboardContent';

function HomeContentInner() {
  return <DashboardContent />;
}

export default function HomeContent() {
  return (
    <ErrorBoundary level="page" componentName="HomeContent">
      <HomeContentInner />
    </ErrorBoundary>
  );
}
