import { Skeleton } from '@/components/ui/Skeleton';

export default function ProviderReputationLoading() {
  return (
    <div className="editorial-workspace min-h-screen">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-20 pt-4 sm:px-8 lg:px-12">
        {/* Back link + hero */}
        <div className="mb-7 grid gap-10 border-b border-slate-900/15 py-10 lg:grid-cols-[0.8fr_1.7fr] lg:py-14">
          <div>
            <Skeleton variant="text" width="120px" height="14px" className="mb-5" />
            <Skeleton variant="text" width="280px" height="18px" />
          </div>
          <div>
            <Skeleton variant="text" width="75%" height="64px" className="mb-5" />
            <Skeleton variant="text" width="70%" height="18px" />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-12">
          <div className="border-y border-slate-900/15 bg-white/45 p-5">
            <Skeleton variant="text" width="160px" height="20px" className="mb-6" />
            <Skeleton variant="circular" width="120px" height="120px" className="mx-auto mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="text" width="100%" height="14px" />
              ))}
            </div>
          </div>
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-y border-slate-900/15 bg-white/45 p-5">
                <Skeleton variant="text" width="180px" height="18px" className="mb-4" />
                <Skeleton variant="rounded" width="100%" height={i === 1 ? 220 : 120} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
