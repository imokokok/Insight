import { Skeleton } from '@/components/ui/Skeleton';
import { SkeletonCard, FormFieldSkeleton } from '@/components/ui/SkeletonPatterns';

export default function SettingsLoading() {
  return (
    <div className="editorial-workspace min-h-screen">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton variant="rounded" width="40px" height="40px" />
          <div>
            <Skeleton variant="text" width="96px" height="24px" className="mb-2" />
            <Skeleton variant="text" width="192px" height="16px" />
          </div>
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          <div className="w-full border-l border-t border-gray-200 md:w-64">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-r border-gray-200 bg-white p-4"
              >
                <Skeleton variant="circular" width="24px" height="24px" />
                <Skeleton variant="text" width="100px" height="16px" />
              </div>
            ))}
          </div>

          <div className="flex-1">
            <SkeletonCard className="p-6">
              <Skeleton variant="text" width="140px" height="20px" />
              <div className="space-y-4">
                <FormFieldSkeleton labelWidth="80px" inputHeight="40px" />
                <FormFieldSkeleton labelWidth="80px" inputHeight="40px" />
                <div>
                  <Skeleton variant="text" width="60px" height="14px" className="mb-2" />
                  <Skeleton variant="rectangular" width="100%" height="80px" />
                </div>
              </div>
              <Skeleton variant="rectangular" width="120px" height="36px" />
            </SkeletonCard>
          </div>
        </div>
      </div>
    </div>
  );
}
