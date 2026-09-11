import type { ReactNode } from 'react';

import { ErrorBoundary } from '@/components/error-boundary';
import { DashboardShell } from '@/components/home/DashboardContent';

interface HomeContentProps {
  children: ReactNode;
}

export default function HomeContent({ children }: HomeContentProps) {
  return (
    <ErrorBoundary level="page" componentName="HomeContent">
      <DashboardShell liveDashboard={children} />
    </ErrorBoundary>
  );
}
