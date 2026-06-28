import { Skeleton } from '@/components/ui/Skeleton';

export default function ReportsLoading() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <Skeleton variant="text" width="200px" height="28px" className="mb-2" />
      <Skeleton variant="text" width="320px" height="16px" className="mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200/70 shadow-sm p-5">
            <Skeleton variant="text" width="120px" height="14px" className="mb-3" />
            <Skeleton variant="text" width="180px" height="20px" className="mb-4" />
            <div className="flex gap-2 mb-3">
              <Skeleton variant="rounded" width="60px" height="22px" />
              <Skeleton variant="rounded" width="70px" height="22px" />
            </div>
            <Skeleton variant="text" width="100%" height="12px" />
            <Skeleton variant="text" width="80%" height="12px" />
          </div>
        ))}
      </div>
    </div>
  );
}
