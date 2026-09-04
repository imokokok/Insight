import { Skeleton } from '@/components/ui/Skeleton';

export function PegMonitorLoading() {
  return (
    <div className="editorial-workspace min-h-screen">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-20 pt-4 sm:px-8 lg:px-12">
        <div className="mb-7 grid gap-10 border-b border-slate-900/15 py-10 lg:grid-cols-[0.8fr_1.7fr] lg:py-14">
          <div>
            <Skeleton variant="text" width="120px" height="14px" className="mb-5" />
            <Skeleton variant="text" width="280px" height="18px" />
          </div>
          <div>
            <Skeleton variant="text" width="82%" height="64px" className="mb-5" />
            <Skeleton variant="text" width="72%" height="18px" />
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 border-y border-slate-900/15 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border-r border-slate-900/10 bg-white/35 p-5">
              <Skeleton variant="text" width="100px" height="12px" className="mb-2" />
              <Skeleton variant="text" width="70px" height="24px" />
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12">
          <div className="border-y border-slate-900/15 bg-white/45 p-5">
            <Skeleton variant="text" width="180px" height="18px" className="mb-5" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} variant="text" width="100%" height="18px" />
              ))}
            </div>
          </div>
          <div className="border-y border-slate-900/15 bg-white/45 p-5">
            <Skeleton variant="text" width="240px" height="24px" className="mb-6" />
            <Skeleton variant="rounded" width="100%" height="320px" />
          </div>
        </div>
      </div>
    </div>
  );
}
