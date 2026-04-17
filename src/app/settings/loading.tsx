import { Skeleton } from '@/components/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton variant="rounded" width="40px" height="40px" />
          <div>
            <Skeleton variant="text" width="96px" height="24px" className="mb-2" />
            <Skeleton variant="text" width="192px" height="16px" />
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-64 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3"
              >
                <Skeleton variant="circular" width="24px" height="24px" />
                <Skeleton variant="text" width="100px" height="16px" />
              </div>
            ))}
          </div>

          <div className="flex-1">
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
              <Skeleton variant="text" width="140px" height="20px" />
              <div className="space-y-4">
                <div>
                  <Skeleton variant="text" width="80px" height="14px" className="mb-2" />
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height="40px"
                    className="rounded-md"
                  />
                </div>
                <div>
                  <Skeleton variant="text" width="80px" height="14px" className="mb-2" />
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height="40px"
                    className="rounded-md"
                  />
                </div>
                <div>
                  <Skeleton variant="text" width="60px" height="14px" className="mb-2" />
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height="80px"
                    className="rounded-md"
                  />
                </div>
              </div>
              <Skeleton variant="rectangular" width="120px" height="36px" className="rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
