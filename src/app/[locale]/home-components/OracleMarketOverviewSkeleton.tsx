export default function OracleMarketOverviewSkeleton() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="skeleton-shimmer">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 mb-4">
              <div className="w-4 h-4 bg-gray-200"></div>
              <div className="w-20 h-4 bg-gray-200"></div>
            </div>
            <div className="w-64 h-10 bg-gray-200 mb-4"></div>
            <div className="w-96 h-6 bg-gray-200"></div>
          </div>
          <div className="skeleton-shimmer flex items-center gap-1 p-1 bg-gray-100">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="px-3 py-2 w-12 h-8 bg-gray-200"></div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-200 p-4 skeleton-shimmer">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-100 w-8 h-8"></div>
                <div className="w-16 h-4 bg-gray-200"></div>
              </div>
              <div className="w-20 h-8 bg-gray-200 mb-1"></div>
              <div className="w-12 h-3 bg-gray-200"></div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="skeleton-shimmer flex items-center gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 w-28 h-10 bg-gray-200"
              ></div>
            ))}
          </div>
          <div className="skeleton-shimmer flex items-center gap-1 p-1 bg-gray-100">
            <div className="px-3 py-1.5 w-16 h-7 bg-gray-200"></div>
            <div className="px-3 py-1.5 w-16 h-7 bg-gray-200"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 p-6 skeleton-shimmer">
            <div className="w-48 h-6 bg-gray-200 mb-4"></div>
            <div className="h-[400px] bg-gray-100"></div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900 p-4 skeleton-shimmer">
              <div className="w-24 h-4 bg-white/30 mb-1"></div>
              <div className="w-12 h-8 bg-white/30"></div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white border border-gray-200 p-4 skeleton-shimmer">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-200"></div>
                    <div className="w-24 h-4 bg-gray-200"></div>
                  </div>
                  <div className="w-10 h-6 bg-gray-200"></div>
                </div>
                <div className="h-2 bg-gray-100 mb-2"></div>
                <div className="flex items-center justify-between">
                  <div className="w-16 h-3 bg-gray-200"></div>
                  <div className="w-16 h-3 bg-gray-200"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
