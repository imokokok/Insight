import { Skeleton } from '@/components/ui/Skeleton';

export default function DocsLoading() {
  return (
    <div className="editorial-workspace min-h-screen">
      <section className="editorial-frame mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-8 border-b border-slate-900/15 pb-12 lg:grid-cols-[0.68fr_1.32fr]">
          <div className="space-y-5">
            <Skeleton variant="text" width="120px" height="14px" />
            <Skeleton variant="text" width="75%" height="16px" />
          </div>
          <div className="space-y-5">
            <Skeleton variant="text" width="92%" height="48px" />
            <Skeleton variant="text" width="72%" height="48px" />
            <Skeleton variant="text" width="75%" height="16px" />
          </div>
        </div>
      </section>

      <div className="editorial-frame mx-auto max-w-[1400px] space-y-12 px-5 py-8 sm:px-8 lg:px-12">
        <section className="space-y-4">
          <Skeleton variant="text" width="180px" height="24px" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3 border border-slate-200 bg-white p-5">
                <Skeleton variant="circular" width="40px" height="40px" />
                <Skeleton variant="text" width="100px" height="18px" />
                <Skeleton variant="text" width="100%" height="14px" />
                <Skeleton variant="text" width="80%" height="14px" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <Skeleton variant="text" width="200px" height="24px" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3 border border-slate-200 bg-white p-5">
                <Skeleton variant="text" width="140px" height="18px" />
                <Skeleton variant="text" width="100%" height="14px" />
                <Skeleton variant="text" width="90%" height="14px" />
                <Skeleton variant="text" width="70%" height="14px" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <Skeleton variant="text" width="160px" height="24px" />
          <div className="space-y-3 border border-slate-200 bg-white p-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0"
              >
                <Skeleton variant="circular" width="8px" height="8px" />
                <Skeleton variant="text" width="60%" height="14px" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
