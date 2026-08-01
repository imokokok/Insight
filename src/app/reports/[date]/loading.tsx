import { Skeleton } from '@/components/ui/Skeleton';

export default function ReportDetailLoading() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <Skeleton variant="text" width="180px" height="14px" className="mb-3" />
      <Skeleton variant="text" width="280px" height="30px" className="mb-2" />
      <Skeleton variant="text" width="360px" height="16px" className="mb-6" />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200/70 p-4 shadow-sm">
            <Skeleton variant="text" width="80px" height="11px" className="mb-2" />
            <Skeleton variant="text" width="60px" height="24px" />
          </div>
        ))}
      </div>

      {/* Sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200/70 shadow-sm p-5 mb-5">
          <Skeleton variant="text" width="160px" height="18px" className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center gap-4">
                <Skeleton variant="circular" width="28px" height="28px" />
                <Skeleton variant="text" width="120px" height="14px" />
                <Skeleton variant="text" width="100px" height="14px" />
                <Skeleton variant="rounded" width="110px" height="10px" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
