import { Link } from 'react-router-dom'
import { MapPin, Building2, CheckCircle2, XCircle } from 'lucide-react'

function ScoreCircle({ score }) {
  const s = typeof score === 'number' && !isNaN(score) ? Math.round(score) : 0
  const color = s >= 75 ? 'text-emerald-600' : s >= 50 ? 'text-amber-600' : 'text-red-600'
  const bgColor = s >= 75 ? 'bg-emerald-50 border-emerald-200' : s >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
  return (
    <div className={`w-14 h-14 rounded-full border-2 ${bgColor} flex items-center justify-center flex-shrink-0`}>
      <span className={`text-base font-mono font-bold ${color}`}>{s}%</span>
    </div>
  )
}

export default function MatchResults({ matches }) {
  if (!matches?.length) return <p className="text-primary/50 text-center py-8">No matches found.</p>

  return (
    <div className="space-y-4">
      {matches.map((match, idx) => {
        const score = match.match_score ?? match.score ?? 0
        const title = match.job_title || match.title || 'Untitled Job'
        const company = match.company || match.company_name || ''
        const location = match.location || ''
        const reasoning = match.reasoning || ''

        return (
          <div key={match.job_id || idx} className="card flex gap-4">
            <ScoreCircle score={score} />
            <div className="flex-1 min-w-0">
              <Link to={`/jobs/${match.job_id}`} className="text-base font-bold text-primary hover:text-accent transition-colors line-clamp-1">
                {title}
              </Link>
              <div className="flex items-center gap-3 text-sm text-primary/50 mt-1">
                {company && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {company}</span>}
                {location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {location}</span>}
              </div>
              {reasoning && <p className="text-sm text-primary/60 mt-2">{reasoning}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {(match.matching_skills || []).map((s) => (
                  <span key={s} className="badge bg-emerald-50 text-emerald-700 text-xs flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> {s}
                  </span>
                ))}
                {(match.missing_skills || []).map((s) => (
                  <span key={s} className="badge bg-red-50 text-red-600 text-xs flex items-center gap-0.5">
                    <XCircle className="w-3 h-3" /> {s}
                  </span>
                ))}
              </div>
              <Link to={`/jobs/${match.job_id}`} className="inline-block mt-3 btn-accent text-sm py-1.5 px-4">
                View & Apply
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
