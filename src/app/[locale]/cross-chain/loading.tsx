import { Skeleton } from '@/components/ui/Skeleton';

export default function CrossChainLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <Skeleton variant="text" width="240px" height="28px" className="mb-2" />
          <Skeleton variant="text" width="400px" height="16px" />
        </div>

        <div className="flex flex-col xl:flex-row gap-4">
          <div className="xl:w-[360px] flex-shrink-0 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <Skeleton variant="text" width="100px" height="18px" />
              <Skeleton variant="rectangular" width="100%" height="36px" className="rounded-md" />
              <Skeleton variant="rectangular" width="100%" height="36px" className="rounded-md" />
              <Skeleton variant="text" width="80px" height="18px" />
              <Skeleton variant="rectangular" width="100%" height="36px" className="rounded-md" />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <Skeleton variant="text" width="140px" height="18px" className="mb-3" />
              <Skeleton variant="rectangular" width="100%" height="200px" className="rounded-md" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg border border-gray-200 p-2 mb-4">
              <div className="flex gap-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} variant="rounded" width="120px" height="36px" />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <Skeleton variant="rectangular" width="100%" height="300px" className="rounded-md" />
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton variant="text" width="60px" height="14px" />
                    <Skeleton variant="text" width="80px" height="20px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
