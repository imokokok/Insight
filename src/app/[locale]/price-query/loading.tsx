import { Skeleton } from '@/components/ui/Skeleton';

export default function PriceQueryLoading() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton variant="text" width="200px" height="28px" className="mb-2" />
            <Skeleton variant="text" width="360px" height="16px" />
          </div>
          <Skeleton variant="rounded" width="160px" height="24px" />
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <aside className="xl:w-[400px] xl:flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <Skeleton variant="text" width="100px" height="18px" />
            <Skeleton variant="rectangular" width="100%" height="40px" className="rounded-md" />
            <Skeleton variant="text" width="80px" height="18px" />
            <Skeleton variant="rectangular" width="100%" height="40px" className="rounded-md" />
            <Skeleton variant="text" width="80px" height="18px" />
            <Skeleton variant="rectangular" width="100%" height="40px" className="rounded-md" />
            <Skeleton variant="text" width="80px" height="18px" />
            <Skeleton variant="rectangular" width="100%" height="40px" className="rounded-md" />
            <Skeleton variant="rectangular" width="100%" height="40px" className="rounded-md" />
          </div>
        </aside>

        <main className="flex-1 min-w-0 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                <Skeleton variant="text" width="80px" height="14px" />
                <Skeleton variant="text" width="100px" height="24px" />
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <Skeleton variant="text" width="140px" height="18px" className="mb-4" />
            <Skeleton variant="rectangular" width="100%" height="300px" className="rounded-md" />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
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
          </div>
        </main>
      </div>
    </div>
  );
}
