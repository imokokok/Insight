import { ErrorBoundary } from '@/components/error-boundary';
import DashboardContent from '@/components/home/DashboardContent';
import type { ServerDashboardData } from '@/lib/home/dashboardData';

interface HomeContentProps {
  initialData: ServerDashboardData;
}

export default function HomeContent({ initialData }: HomeContentProps) {
  return (
    <ErrorBoundary level="page" componentName="HomeContent">
      <DashboardContent initialData={initialData} />
    </ErrorBoundary>
  );
}
