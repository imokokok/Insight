export default function ArbitrageHeatmapSkeleton() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
        <div className="text-center mb-10 skeleton-shimmer">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 mb-4">
            <div className="w-4 h-4 bg-gray-200"></div>
            <div className="w-20 h-4 bg-gray-200"></div>
          </div>
          <div className="w-64 h-10 bg-gray-200 mx-auto mb-4"></div>
          <div className="w-96 h-6 bg-gray-200 mx-auto"></div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8 skeleton-shimmer">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-2 w-24 h-10 bg-gray-200"></div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 p-4 skeleton-shimmer">
            <div className="w-20 h-4 bg-gray-300 mb-1"></div>
            <div className="w-24 h-8 bg-gray-300"></div>
          </div>
          <div className="bg-white border border-gray-200 p-4 skeleton-shimmer">
            <div className="w-20 h-4 bg-gray-300 mb-1"></div>
            <div className="w-20 h-8 bg-gray-300"></div>
          </div>
          <div className="bg-white border border-gray-200 p-4 skeleton-shimmer">
            <div className="w-20 h-4 bg-gray-300 mb-1"></div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-8 bg-gray-300"></div>
              <div className="w-5 h-5 bg-gray-300"></div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 skeleton-shimmer">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border p-4 h-32 bg-gray-200"></div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200"></div>
              <div className="w-32 h-4 bg-gray-200"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200"></div>
              <div className="w-36 h-4 bg-gray-200"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200"></div>
              <div className="w-32 h-4 bg-gray-200"></div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 p-4 flex items-center gap-4 skeleton-shimmer">
          <div className="p-2 bg-blue-100 w-9 h-9"></div>
          <div className="flex-1">
            <div className="w-32 h-5 bg-gray-300 mb-1"></div>
            <div className="w-full h-4 bg-gray-300"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
