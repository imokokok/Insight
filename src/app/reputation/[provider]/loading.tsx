import { Skeleton } from '@/components/ui/Skeleton';

export default function ProviderReputationLoading() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      {/* Back link + hero */}
      <Skeleton variant="text" width="80px" height="14px" className="mb-4" />
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton variant="circular" width="56px" height="56px" />
          <div>
            <Skeleton variant="text" width="160px" height="24px" className="mb-2" />
            <Skeleton variant="text" width="220px" height="14px" />
          </div>
        </div>
        <Skeleton variant="text" width="100%" height="14px" />
        <Skeleton variant="text" width="90%" height="14px" />
      </div>

      {/* Score grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200/70 p-4 shadow-sm">
            <Skeleton variant="text" width="90px" height="11px" className="mb-2" />
            <Skeleton variant="text" width="70px" height="28px" />
            <Skeleton variant="rounded" width="100%" height="6px" className="mt-2" />
          </div>
        ))}
      </div>

      {/* Trend chart placeholder */}
      <div className="bg-white rounded-xl border border-gray-200/70 shadow-sm p-5 mb-6">
        <Skeleton variant="text" width="140px" height="18px" className="mb-4" />
        <Skeleton variant="rounded" width="100%" height="200px" />
      </div>

      {/* Detail sections */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200/70 shadow-sm p-5 mb-5">
          <Skeleton variant="text" width="180px" height="18px" className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <Skeleton variant="text" width="120px" height="14px" />
                <Skeleton variant="text" width="80px" height="14px" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
