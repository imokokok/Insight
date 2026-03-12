export default function ArbitrageHeatmapSkeleton() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
        <div className="text-center mb-12 animate-pulse">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full mb-4">
            <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
            <div className="w-20 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="w-64 h-10 bg-gray-200 rounded-lg mx-auto mb-4"></div>
          <div className="w-96 h-6 bg-gray-200 rounded mx-auto"></div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-5 py-2.5 w-24 h-11 bg-gray-200 rounded-xl"></div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 animate-pulse">
            <div className="w-20 h-4 bg-gray-300 rounded mb-1"></div>
            <div className="w-24 h-8 bg-gray-300 rounded"></div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200 animate-pulse">
            <div className="w-20 h-4 bg-gray-300 rounded mb-1"></div>
            <div className="w-20 h-8 bg-gray-300 rounded"></div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200 animate-pulse">
            <div className="w-20 h-4 bg-gray-300 rounded mb-1"></div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-8 bg-gray-300 rounded"></div>
              <div className="w-5 h-5 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border-2 p-4 h-32 bg-gray-200"></div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-200"></div>
              <div className="w-32 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-200"></div>
              <div className="w-36 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-200"></div>
              <div className="w-32 h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4 animate-pulse">
          <div className="p-2 bg-blue-100 rounded-lg w-9 h-9"></div>
          <div className="flex-1">
            <div className="w-32 h-5 bg-gray-300 rounded mb-1"></div>
            <div className="w-full h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
