import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ApplicationCard from '../components/applications/ApplicationCard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUSES = ['all', 'applied', 'reviewed', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn']

export default function Applications() {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    if (user?.uid) fetchApplications()
  }, [user?.uid])

  async function fetchApplications() {
    const { data } = await supabase
      .from('applications')
      .select('*, jobs(title, company_name, location, job_type, skills_required)')
      .eq('candidate_id', user.uid)
      .order('created_at', { ascending: false })
    setApplications(data || [])
    setLoading(false)
  }

  async function withdrawApplication(appId) {
    const { error } = await supabase.from('applications').update({ status: 'withdrawn', updated_at: new Date().toISOString() }).eq('id', appId)
    if (error) { toast.error(error.message); return }
    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: 'withdrawn' } : a))
    toast.success('Application withdrawn')
  }

  const filtered = filterStatus === 'all' ? applications : applications.filter((a) => a.status === filterStatus)

  function getCount(status) {
    if (status === 'all') return applications.length
    return applications.filter((a) => a.status === status).length
  }

  if (loading) return <LoadingSpinner className="min-h-screen" size="lg" />

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">My Applications</h1>
      <p className="text-slate-500 mb-6">Track all your job applications</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map((s) => {
          const count = getCount(s)
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`badge py-1.5 px-3 capitalize cursor-pointer transition-colors duration-300 ${filterStatus === s ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {s} {count > 0 && <span className="ml-1 text-xs opacity-75">({count})</span>}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-lg">
            {filterStatus === 'all' ? 'No applications yet.' : `No ${filterStatus} applications.`}
          </p>
          <Link to="/jobs" className="btn-accent mt-4 inline-block text-sm">Browse Jobs</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div key={app.id}>
              <div className="relative">
                <ApplicationCard application={app} />
                {app.status === 'applied' && (
                  <button onClick={() => withdrawApplication(app.id)} className="absolute top-4 right-4 text-xs text-red-500 hover:text-red-600 font-medium">
                    Withdraw
                  </button>
                )}
              </div>
              {/* AI Rejection Feedback */}
              {app.status === 'rejected' && app.recruiter_notes && (
                <div className="ml-4 mt-1 mb-3 bg-amber-50 border-l-4 border-l-amber-400 rounded-r-lg p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1">How to improve for similar roles:</p>
                  <p className="text-xs text-amber-700 leading-relaxed">{app.recruiter_notes}</p>
                  {app.jobs?.skills_required?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {app.jobs.skills_required.map(s => (
                        <Link key={s} to={`/skill-quiz?skill=${encodeURIComponent(s)}`} className="badge bg-amber-100 text-amber-700 text-xs py-1 px-2.5 hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors">
                          Verify {s} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
