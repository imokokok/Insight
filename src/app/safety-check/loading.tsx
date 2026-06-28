import { Skeleton } from '@/components/ui/Skeleton';

export default function SafetyCheckLoading() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <Skeleton variant="text" width="220px" height="28px" className="mb-2" />
      <Skeleton variant="text" width="340px" height="16px" className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Skeleton variant="text" width="160px" height="18px" className="mb-5" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <Skeleton variant="text" width="90px" height="12px" className="mb-2" />
                <Skeleton variant="rounded" width="100%" height="40px" />
              </div>
            ))}
          </div>
          <Skeleton variant="rounded" width="100%" height="44px" className="mt-5" />
        </div>

        {/* Result dashboard */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Skeleton variant="text" width="140px" height="18px" className="mb-5" />
          <div className="flex justify-center mb-6">
            <Skeleton variant="circular" width="160px" height="160px" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton variant="text" width="100px" height="14px" />
                <Skeleton variant="text" width="70px" height="14px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
