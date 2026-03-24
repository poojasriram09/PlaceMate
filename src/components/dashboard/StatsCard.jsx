export default function StatsCard({ title, value, icon: Icon, color = 'accent' }) {
  const colors = {
    accent: 'bg-accent/10 text-accent',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    primary: 'bg-slate-100 text-slate-700',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className="card flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
        <p className="text-xs text-slate-500">{title}</p>
      </div>
    </div>
  )
}
