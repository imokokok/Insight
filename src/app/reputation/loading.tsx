import { Skeleton } from '@/components/ui/Skeleton';

export default function ReputationLoading() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm mb-6 px-6 py-10 sm:px-8 sm:py-12">
        <Skeleton variant="rounded" width="160px" height="22px" className="mb-4" />
        <Skeleton variant="text" width="280px" height="36px" className="mb-3" />
        <Skeleton variant="text" width="420px" height="18px" />
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-200/60 p-4 mb-6">
        <Skeleton variant="text" width="180px" height="16px" className="mb-2" />
        <Skeleton variant="text" width="100%" height="14px" />
        <Skeleton variant="text" width="90%" height="14px" />
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200/70 p-4 shadow-sm">
            <Skeleton variant="text" width="80px" height="11px" className="mb-2" />
            <Skeleton variant="text" width="60px" height="24px" />
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <Skeleton variant="rounded" width="100%" height="42px" style={{ maxWidth: '400px' }} />
        <Skeleton variant="rounded" width="240px" height="42px" />
        <Skeleton variant="rounded" width="180px" height="42px" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="bg-gray-50/80 border-b border-gray-100 px-5 py-3.5 flex gap-4">
          <Skeleton variant="text" width="80px" height="12px" />
          <Skeleton variant="text" width="70px" height="12px" />
          <Skeleton variant="text" width="60px" height="12px" />
          <Skeleton variant="text" width="60px" height="12px" />
          <Skeleton variant="text" width="70px" height="12px" />
          <Skeleton variant="text" width="60px" height="12px" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="flex items-center gap-3 w-[260px]">
              <Skeleton variant="circular" width="38px" height="38px" />
              <div className="space-y-1.5">
                <Skeleton variant="text" width="90px" height="14px" />
                <Skeleton variant="text" width="60px" height="11px" />
              </div>
            </div>
            <Skeleton variant="text" width="52px" height="14px" />
            <Skeleton variant="rounded" width="110px" height="10px" />
            <Skeleton variant="rounded" width="110px" height="10px" />
            <Skeleton variant="text" width="100px" height="14px" />
            <Skeleton variant="text" width="110px" height="14px" />
            <Skeleton variant="text" width="100px" height="14px" />
            <Skeleton variant="text" width="90px" height="14px" />
          </div>
        ))}
      </div>
    </div>
  );
}
