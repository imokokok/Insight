import { Skeleton } from '@/components/ui/Skeleton';

export default function CrossOracleLoading() {
  return (
    <div className="editorial-workspace mx-auto min-h-screen max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
      <p className="editorial-index mb-6 border-b border-slate-900/15 pb-4">
        Loading — Cross-oracle record
      </p>
      {/* Control panel */}
      <div className="mb-6 border-y border-slate-900/15 bg-white/55 p-5">
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
      <div className="overflow-hidden border-y border-slate-900/15 bg-white/55">
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
