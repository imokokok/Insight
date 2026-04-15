import { Skeleton } from '@/components/ui/Skeleton';

export default function AlertsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Skeleton variant="text" width="200px" height="32px" className="mb-2" />
        <Skeleton variant="text" width="320px" height="16px" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <Skeleton variant="text" width="120px" height="20px" />
            <Skeleton variant="rectangular" width="100%" height="40px" className="rounded-md" />
            <Skeleton variant="rectangular" width="100%" height="40px" className="rounded-md" />
            <Skeleton variant="rectangular" width="100%" height="40px" className="rounded-md" />
            <Skeleton variant="rectangular" width="100%" height="36px" className="rounded-md" />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton variant="text" width="160px" height="18px" />
                <Skeleton variant="rounded" width="80px" height="24px" />
              </div>
              <div className="flex gap-4">
                <Skeleton variant="text" width="100px" height="14px" />
                <Skeleton variant="text" width="120px" height="14px" />
                <Skeleton variant="text" width="90px" height="14px" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
          <Skeleton variant="text" width="140px" height="20px" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton variant="circular" width="32px" height="32px" />
              <Skeleton variant="text" width="60%" height="14px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
