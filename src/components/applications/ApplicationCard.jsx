import { Link } from 'react-router-dom'
import { Building2, Calendar } from 'lucide-react'
import { STATUS_COLORS, formatDate } from '../../utils/helpers'

export default function ApplicationCard({ application, showJob = true }) {
  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        {showJob && (
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">{application.jobs?.company_name}</span>
          </div>
        )}
        <Link to={`/jobs/${application.job_id}`} className="text-lg font-bold text-slate-900 hover:text-primary">
          {application.jobs?.title || 'Job'}
        </Link>
        <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Applied {formatDate(application.created_at)}</span>
          {application.match_score && (
            <span className="font-mono text-accent font-semibold">{Math.round(application.match_score)}% match</span>
          )}
        </div>
      </div>
      <span className={`badge capitalize ${STATUS_COLORS[application.status]}`}>{application.status}</span>
    </div>
  )
}
