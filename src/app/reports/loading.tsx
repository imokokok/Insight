import { Skeleton } from '@/components/ui/Skeleton';

export default function ReportsLoading() {
  return (
    <div className="editorial-workspace min-h-screen">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-20 pt-4 sm:px-8 lg:px-12">
        <div className="mb-7 grid gap-10 border-b border-slate-900/15 py-10 lg:grid-cols-[0.8fr_1.7fr] lg:py-14">
          <div>
            <Skeleton variant="text" width="120px" height="14px" className="mb-5" />
            <Skeleton variant="text" width="300px" height="18px" />
          </div>
          <div>
            <Skeleton variant="text" width="85%" height="64px" className="mb-5" />
            <Skeleton variant="text" width="70%" height="18px" />
          </div>
        </div>

        <div className="grid grid-cols-1 border-y border-slate-900/15 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-r border-slate-900/10 bg-white/35 p-5">
              <Skeleton variant="text" width="120px" height="14px" className="mb-3" />
              <Skeleton variant="text" width="180px" height="20px" className="mb-4" />
            </div>
          ))}
        </div>

        <div className="mt-10 border-y border-slate-900/15 bg-white/45">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="grid gap-4 border-b border-slate-900/10 px-5 py-5 sm:grid-cols-[160px_1fr_140px]"
            >
              <Skeleton variant="text" width="120px" height="14px" />
              <Skeleton variant="text" width="90%" height="14px" />
              <Skeleton variant="text" width="100px" height="14px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
