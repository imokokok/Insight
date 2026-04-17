import { Skeleton } from '@/components/ui/Skeleton';

export default function FavoritesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton variant="rounded" width="40px" height="40px" />
          <div>
            <Skeleton variant="text" width="180px" height="28px" className="mb-1" />
            <Skeleton variant="text" width="260px" height="16px" />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Skeleton variant="rectangular" width="100%" height="40px" className="rounded-md" />
      </div>

      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" width="96px" height="40px" />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton variant="text" width="120px" height="18px" />
              <Skeleton variant="circular" width="28px" height="28px" />
            </div>
            <Skeleton variant="text" width="80px" height="14px" />
            <div className="flex gap-2">
              <Skeleton variant="rounded" width="60px" height="24px" />
              <Skeleton variant="rounded" width="60px" height="24px" />
            </div>
            <Skeleton variant="text" width="60%" height="14px" />
          </div>
        ))}
      </div>
    </div>
  );
}
