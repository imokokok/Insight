import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeaderSkeleton, SkeletonCard } from '@/components/ui/SkeletonPatterns';

export default function SnapshotsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <PageHeaderSkeleton titleWidth="240px" subtitleWidth="400px" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="p-5">
            <div className="flex items-center justify-between">
              <Skeleton variant="text" width="120px" height="18px" />
              <Skeleton variant="rounded" width="60px" height="24px" />
            </div>
            <Skeleton variant="text" width="80px" height="14px" />
            <div className="flex gap-2">
              <Skeleton variant="rounded" width="50px" height="22px" />
              <Skeleton variant="rounded" width="50px" height="22px" />
              <Skeleton variant="rounded" width="50px" height="22px" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <div>
                <Skeleton variant="text" width="60px" height="12px" />
                <Skeleton variant="text" width="80px" height="16px" />
              </div>
              <div>
                <Skeleton variant="text" width="60px" height="12px" />
                <Skeleton variant="text" width="80px" height="16px" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
