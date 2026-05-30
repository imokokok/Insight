import { Skeleton } from '@/components/ui/Skeleton';
import {
  PageHeaderSkeleton,
  SkeletonCard,
  FormFieldSkeleton,
} from '@/components/ui/SkeletonPatterns';

export default function CrossChainLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeaderSkeleton titleWidth="240px" subtitleWidth="400px" />

        <div className="flex flex-col xl:flex-row gap-4">
          <div className="xl:w-[360px] flex-shrink-0 space-y-4">
            <SkeletonCard className="p-4">
              <FormFieldSkeleton labelWidth="100px" inputHeight="36px" />
              <FormFieldSkeleton labelWidth="80px" inputHeight="36px" />
            </SkeletonCard>

            <SkeletonCard className="p-4">
              <Skeleton variant="text" width="140px" height="18px" className="mb-3" />
              <Skeleton variant="rectangular" width="100%" height="200px" className="rounded-md" />
            </SkeletonCard>
          </div>

          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg border border-gray-200 p-2 mb-4">
              <div className="flex gap-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} variant="rounded" width="120px" height="36px" />
                ))}
              </div>
            </div>

            <SkeletonCard className="p-6">
              <Skeleton variant="rectangular" width="100%" height="300px" className="rounded-md" />
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton variant="text" width="60px" height="14px" />
                    <Skeleton variant="text" width="80px" height="20px" />
                  </div>
                ))}
              </div>
            </SkeletonCard>
          </div>
        </div>
      </div>
    </div>
  );
}
