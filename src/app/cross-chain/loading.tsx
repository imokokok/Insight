import { Skeleton } from '@/components/ui/Skeleton';

export default function CrossChainLoading() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <Skeleton variant="text" width="240px" height="28px" className="mb-2" />
      <Skeleton variant="text" width="360px" height="16px" className="mb-6" />

      {/* Chain selector + filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap gap-3 mb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width="100px" height="36px" />
          ))}
        </div>
        <div className="flex gap-3">
          <Skeleton variant="rounded" width="180px" height="40px" />
          <Skeleton variant="rounded" width="160px" height="40px" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200/70 p-4 shadow-sm">
            <Skeleton variant="text" width="80px" height="11px" className="mb-2" />
            <Skeleton variant="text" width="60px" height="24px" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="bg-gray-50/80 border-b border-gray-100 px-5 py-3.5 flex gap-6">
          <Skeleton variant="text" width="90px" height="12px" />
          <Skeleton variant="text" width="80px" height="12px" />
          <Skeleton variant="text" width="100px" height="12px" />
          <Skeleton variant="text" width="70px" height="12px" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <Skeleton variant="text" width="60px" height="14px" />
            <Skeleton variant="text" width="110px" height="14px" />
            <Skeleton variant="text" width="100px" height="14px" />
            <Skeleton variant="rounded" width="130px" height="10px" />
          </div>
        ))}
      </div>
    </div>
  );
}
