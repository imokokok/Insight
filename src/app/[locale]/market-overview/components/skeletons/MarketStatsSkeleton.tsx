'use client';

export default function MarketStatsSkeleton() {
  return (
    <div className="w-full">
      <div className="hidden sm:flex items-center overflow-x-auto gap-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col">
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="flex items-baseline gap-2 mt-0.5">
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="flex items-center gap-0.5">
                  <div className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-10 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
            {i < 3 && <span className="text-gray-200 mx-4 sm:mx-6">|</span>}
          </div>
        ))}
        <span className="text-gray-200 mx-6">|</span>
        {[1, 2, 3].map((i) => (
          <div key={`secondary-${i}`} className="flex items-center">
            <div className="flex flex-col">
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="flex items-baseline gap-2 mt-0.5">
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="flex items-center gap-0.5">
                  <div className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-10 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
            {i < 3 && <span className="text-gray-200 mx-4 sm:mx-6">|</span>}
          </div>
        ))}
      </div>

      <div className="flex sm:hidden items-start gap-6 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col flex-shrink-0">
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="flex items-center gap-0.5">
                <div className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-10 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
