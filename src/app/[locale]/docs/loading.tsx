import { Skeleton } from '@/components/ui/Skeleton';

export default function DocsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="py-16 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Skeleton variant="rounded" width="120px" height="28px" className="mx-auto" />
          <Skeleton variant="text" width="60%" height="36px" className="mx-auto" />
          <Skeleton variant="text" width="40%" height="36px" className="mx-auto" />
          <Skeleton variant="text" width="70%" height="16px" className="mx-auto" />
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <section className="space-y-4">
          <Skeleton variant="text" width="180px" height="24px" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
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
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
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
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
              >
                <Skeleton variant="circular" width="8px" height="8px" />
                <Skeleton variant="text" width="60%" height="14px" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
