export default function OracleMarketOverviewSkeleton() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="animate-pulse">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full mb-4">
              <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="w-64 h-10 bg-gray-200 rounded-lg mb-4"></div>
            <div className="w-96 h-6 bg-gray-200 rounded"></div>
          </div>
          <div className="animate-pulse flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="px-3 py-2 w-12 h-8 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-100 rounded-lg w-8 h-8"></div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="w-20 h-8 bg-gray-200 rounded mb-1"></div>
              <div className="w-12 h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="animate-pulse flex items-center gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 w-28 h-10 bg-gray-200 rounded-xl"
              ></div>
            ))}
          </div>
          <div className="animate-pulse flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <div className="px-3 py-1.5 w-16 h-7 bg-gray-200 rounded-md"></div>
            <div className="px-3 py-1.5 w-16 h-7 bg-gray-200 rounded-md"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-pulse">
            <div className="w-48 h-6 bg-gray-200 rounded mb-4"></div>
            <div className="h-[400px] bg-gray-100 rounded-xl"></div>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 animate-pulse">
              <div className="w-24 h-4 bg-white/30 rounded mb-1"></div>
              <div className="w-12 h-8 bg-white/30 rounded"></div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="w-10 h-6 bg-gray-200 rounded"></div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full mb-2"></div>
                <div className="flex items-center justify-between">
                  <div className="w-16 h-3 bg-gray-200 rounded"></div>
                  <div className="w-16 h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
