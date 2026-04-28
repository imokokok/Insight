import { Skeleton } from '@/components/ui/Skeleton';

export default function SnapshotsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <div className="mb-8">
        <Skeleton variant="text" width="240px" height="28px" className="mb-2" />
        <Skeleton variant="text" width="400px" height="16px" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
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
          </div>
        ))}
      </div>
    </div>
  );
}
