export default function RootLoading() {
  return (
    <main className="editorial-workspace min-h-screen" aria-busy="true" aria-label="Loading page">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <span className="sr-only" role="status">
          Loading page
        </span>
        <div className="animate-pulse space-y-8" aria-hidden="true">
          <div className="h-3 w-24 bg-slate-200" />
          <div className="max-w-3xl space-y-3">
            <div className="h-12 w-full bg-slate-200 sm:h-16" />
            <div className="h-12 w-4/5 bg-slate-200 sm:h-16" />
          </div>
          <div className="max-w-2xl space-y-2">
            <div className="h-4 w-full bg-slate-100" />
            <div className="h-4 w-11/12 bg-slate-100" />
          </div>
          <div className="grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-3">
            {['one', 'two', 'three'].map((key) => (
              <div key={key} className="h-36 bg-[#f8f7f4]" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
