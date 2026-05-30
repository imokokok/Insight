import { Skeleton } from '@/components/ui/Skeleton';
import {
  PageHeaderSkeleton,
  StatsCardsSkeleton,
  ChartAreaSkeleton,
  SkeletonCard,
  FormFieldSkeleton,
} from '@/components/ui/SkeletonPatterns';

export default function PriceQueryLoading() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeaderSkeleton titleWidth="200px" subtitleWidth="360px" />
          <Skeleton variant="rounded" width="160px" height="24px" />
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <aside className="xl:w-[400px] xl:flex-shrink-0">
          <SkeletonCard className="p-6">
            <FormFieldSkeleton labelWidth="100px" inputHeight="40px" />
            <FormFieldSkeleton labelWidth="80px" inputHeight="40px" />
            <FormFieldSkeleton labelWidth="80px" inputHeight="40px" />
            <FormFieldSkeleton labelWidth="80px" inputHeight="40px" />
            <Skeleton variant="rectangular" width="100%" height="40px" className="rounded-md" />
          </SkeletonCard>
        </aside>

        <main className="flex-1 min-w-0 space-y-4">
          <StatsCardsSkeleton />

          <ChartAreaSkeleton titleWidth="140px" />

          <SkeletonCard className="p-6">
            <Skeleton variant="text" width="120px" height="18px" className="mb-4" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0"
              >
                <Skeleton variant="circular" width="32px" height="32px" />
                <Skeleton variant="text" width="120px" height="16px" />
                <Skeleton variant="text" width="100px" height="16px" />
                <Skeleton variant="text" width="80px" height="16px" />
              </div>
            ))}
          </SkeletonCard>
        </main>
      </div>
    </div>
  );
}
