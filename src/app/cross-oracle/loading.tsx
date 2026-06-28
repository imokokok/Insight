import { Skeleton } from '@/components/ui/Skeleton';

export default function CrossOracleLoading() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      {/* Control panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <Skeleton variant="text" width="180px" height="20px" className="mb-4" />
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton variant="rounded" width="220px" height="40px" />
          <Skeleton variant="rounded" width="180px" height="40px" />
          <Skeleton variant="rounded" width="160px" height="40px" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width="120px" height="36px" />
        ))}
      </div>

      {/* Price table */}
      <div className="bg-white rounded-xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="bg-gray-50/80 border-b border-gray-100 px-5 py-3.5 flex gap-6">
          <Skeleton variant="text" width="100px" height="12px" />
          <Skeleton variant="text" width="80px" height="12px" />
          <Skeleton variant="text" width="90px" height="12px" />
          <Skeleton variant="text" width="70px" height="12px" />
          <Skeleton variant="text" width="80px" height="12px" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <Skeleton variant="circular" width="32px" height="32px" />
            <Skeleton variant="text" width="80px" height="14px" />
            <Skeleton variant="text" width="100px" height="14px" />
            <Skeleton variant="rounded" width="120px" height="10px" />
            <Skeleton variant="text" width="90px" height="14px" />
            <Skeleton variant="text" width="70px" height="14px" />
          </div>
        ))}
      </div>
    </div>
  );
}
