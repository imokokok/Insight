export default function HomeLoading() {
  return (
    <main className="editorial-workspace min-h-screen px-5 py-10 sm:px-8 lg:px-12">
      <div className="editorial-frame mx-auto max-w-[1440px] motion-safe:animate-pulse">
        <div className="grid gap-10 border-b border-slate-900/15 pb-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div>
            <div className="h-3 w-36 bg-blue-200/70" />
            <div className="mt-8 h-3 w-64 max-w-full bg-slate-200" />
            <div className="mt-3 h-3 w-48 bg-slate-200" />
          </div>
          <div>
            <div className="h-14 w-full bg-slate-200 sm:h-20" />
            <div className="mt-3 h-14 w-4/5 bg-slate-200 sm:h-20" />
            <div className="mt-8 h-4 w-3/4 bg-slate-200" />
            <div className="mt-3 h-4 w-2/3 bg-slate-200" />
            <div className="mt-10 grid border-y border-slate-900/10 sm:grid-cols-3 sm:divide-x sm:divide-slate-900/10">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="px-0 py-5 sm:px-5">
                  <div className="h-3 w-20 bg-blue-100" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-8 py-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div className="h-3 w-28 bg-blue-200/70" />
          <div className="grid border-y border-slate-900/15 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="border-b border-slate-900/10 p-6 md:border-r">
                <div className="h-3 w-16 bg-slate-200" />
                <div className="mt-6 h-8 w-2/3 bg-slate-200" />
                <div className="mt-4 h-3 w-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
