export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-slate-200 rounded-lg" />
        <div className="flex-1">
          <div className="h-3 bg-slate-200 rounded w-24 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-48" />
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        <div className="h-5 bg-slate-200 rounded-full w-20" />
        <div className="h-5 bg-slate-200 rounded-full w-16" />
        <div className="h-5 bg-slate-200 rounded-full w-14" />
      </div>
      <div className="h-3 bg-slate-200 rounded w-32 mb-3" />
      <div className="flex gap-1.5">
        <div className="h-5 bg-slate-200 rounded-full w-14" />
        <div className="h-5 bg-slate-200 rounded-full w-16" />
        <div className="h-5 bg-slate-200 rounded-full w-12" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card animate-pulse flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-lg" />
          <div>
            <div className="h-6 bg-slate-200 rounded w-12 mb-1" />
            <div className="h-3 bg-slate-200 rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
