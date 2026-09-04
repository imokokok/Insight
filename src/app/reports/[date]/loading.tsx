import { Skeleton } from '@/components/ui/Skeleton';

export default function ReportDetailLoading() {
  return (
    <div className="editorial-workspace min-h-screen">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-20 pt-4 sm:px-8 lg:px-12">
        <div className="mb-7 grid gap-10 border-b border-slate-900/15 py-10 lg:grid-cols-[0.8fr_1.7fr] lg:py-14">
          <div>
            <Skeleton variant="text" width="120px" height="14px" className="mb-5" />
            <Skeleton variant="text" width="280px" height="18px" />
          </div>
          <div>
            <Skeleton variant="text" width="80%" height="64px" className="mb-5" />
            <Skeleton variant="text" width="75%" height="18px" />
          </div>
        </div>

        {/* Summary stats */}
        <div className="mb-8 grid grid-cols-2 border-y border-slate-900/15 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-r border-slate-900/10 bg-white/35 p-4">
              <Skeleton variant="text" width="80px" height="11px" className="mb-2" />
              <Skeleton variant="text" width="60px" height="24px" />
            </div>
          ))}
        </div>

        {/* Sections */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mb-5 border-y border-slate-900/15 bg-white/45 p-5">
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
    </div>
  );
}
