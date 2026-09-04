import { Skeleton } from '@/components/ui/Skeleton';

export default function ReputationLoading() {
  return (
    <div className="editorial-workspace min-h-screen">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-20 pt-4 sm:px-8 lg:px-12">
        {/* Hero */}
        <div className="mb-7 grid gap-10 border-b border-slate-900/15 py-10 lg:grid-cols-[0.8fr_1.7fr] lg:py-14">
          <div>
            <Skeleton variant="text" width="120px" height="14px" className="mb-5" />
            <Skeleton variant="text" width="300px" height="18px" />
          </div>
          <div>
            <Skeleton variant="text" width="80%" height="64px" className="mb-5" />
            <Skeleton variant="text" width="70%" height="18px" />
          </div>
        </div>

        {/* Info card */}
        <div className="mb-6 border-y border-slate-900/15 bg-white/35 p-4">
          <Skeleton variant="text" width="180px" height="16px" className="mb-2" />
          <Skeleton variant="text" width="100%" height="14px" />
          <Skeleton variant="text" width="90%" height="14px" />
        </div>

        {/* Metric strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-r border-slate-900/10 bg-white/35 p-4">
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
        <div className="overflow-hidden border-y border-slate-900/15 bg-white/45">
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
    </div>
  );
}
