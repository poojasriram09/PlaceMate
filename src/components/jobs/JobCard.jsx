import { Link } from 'react-router-dom'
import { MapPin, Clock, Bookmark, BookmarkCheck, Building2, ShieldCheck, CheckCircle2, Lock } from 'lucide-react'
import { timeAgo, formatSalary } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import { calculateMatchScore } from '../../lib/scoring'
import { computeEligibility } from '../../lib/eligibility'

export default function JobCard({ job, saved, onToggleSave }) {
  const { profile } = useAuth()

  const match = (profile?.role === 'candidate' && profile?.skills?.length > 0)
    ? calculateMatchScore(profile, job)
    : null

  const elig = (profile?.role === 'candidate' && profile?.skills?.length > 0 && job?.skills_required?.length > 0)
    ? computeEligibility(profile, job)
    : null

  return (
    <div className="card group relative">
      {/* Match score badge */}
      {match && (
        <div className={`absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
          match.score >= 75 ? 'bg-emerald-100 text-emerald-700' :
          match.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
        }`}>
          {match.score}%
        </div>
      )}

      <div className="flex items-start gap-3 mb-3 pr-12">
        <div className="w-11 h-11 bg-accent-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-accent" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 flex items-center gap-1">
            {job.company_name}
            {job.profiles?.verification_status === 'verified' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" title="Verified Recruiter" />}
          </p>
          <Link to={`/jobs/${job.id}`} className="text-base font-bold text-slate-900 hover:text-primary transition-colors duration-200 line-clamp-1">
            {job.title}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3 text-sm text-slate-500">
        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
        <span className="badge bg-accent-50 text-accent-700 capitalize text-xs">{job.job_type}</span>
        {job.target_years?.length > 0 && (
          <span className="badge bg-slate-100 text-slate-600 text-xs">
            {job.target_years.map(y => y + ['st','nd','rd','th'][Math.min(y-1,3)]).join(', ')} yr
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600 font-mono mb-3">{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</p>

      {job.skills_required?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.skills_required.slice(0, 4).map((skill) => {
            const isMatch = match?.matching_skills?.some(ms => ms.toLowerCase() === skill.toLowerCase())
            return (
              <span key={skill} className={`badge text-xs ${isMatch ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {skill}
              </span>
            )
          })}
          {job.skills_required.length > 4 && (
            <span className="badge bg-slate-100 text-slate-500 text-xs">+{job.skills_required.length - 4}</span>
          )}
        </div>
      )}

      {/* Eligibility indicator */}
      {elig && (
        <div className="mb-3">
          {elig.eligible ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> {elig.verifiedCount}/{elig.totalRequired} skills verified — eligible</span>
          ) : elig.canApplyWithWarning ? (
            <span className="flex items-center gap-1 text-xs text-amber-600"><CheckCircle2 className="w-3.5 h-3.5" /> {elig.verifiedCount}/{elig.totalRequired} verified</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400"><Lock className="w-3.5 h-3.5" /> Verify skills to apply</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <Link to={`/jobs/${job.id}`} className="text-sm font-medium text-accent hover:text-accent-dark transition-colors duration-200">
          View Details →
        </Link>
        <div className="flex items-center gap-2">
          {job.deadline && (
            <span className={`text-xs ${new Date(job.deadline) < new Date(new Date().toDateString()) ? 'text-red-500' : 'text-primary/40'}`}>
              {new Date(job.deadline) < new Date(new Date().toDateString()) ? 'Expired' : `Due ${new Date(job.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </span>
          )}
          {!job.deadline && <span className="text-xs text-slate-400">{timeAgo(job.created_at)}</span>}
          {onToggleSave && (
            <button onClick={() => onToggleSave(job.id)} className="text-slate-400 hover:text-accent transition-colors duration-200">
              {saved ? <BookmarkCheck className="w-4 h-4 text-accent" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
