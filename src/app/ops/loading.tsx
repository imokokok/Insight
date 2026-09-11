export default function OpsLoading() {
  return (
    <div className="animate-pulse px-5 py-6 sm:px-8" aria-label="正在加载运营数据">
      <div className="mb-6 h-7 w-48 bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="mt-6 h-80 border border-slate-200 bg-white" />
    </div>
  );
}
