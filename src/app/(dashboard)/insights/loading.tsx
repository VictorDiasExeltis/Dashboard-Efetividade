export default function Loading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-slate-200 rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 w-36 bg-slate-200 rounded" />
                <div className="h-3 w-48 bg-slate-100 rounded" />
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, j) => <div key={j} className="h-9 bg-slate-100 rounded-lg" />)}
          </div>
        ))}
      </div>
    </div>
  );
}
