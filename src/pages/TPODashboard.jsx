import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import StatsCard from '../components/dashboard/StatsCard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Shield, Users, Briefcase, CheckCircle2, XCircle, Clock, Eye, Ban, BarChart3, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TPODashboard() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('requests')
  const [stats, setStats] = useState({ candidates: 0, recruiters: 0, verified: 0, pending: 0, jobs: 0, applications: 0, placements: 0 })
  const [requests, setRequests] = useState([])
  const [allJobs, setAllJobs] = useState([])
  const [allRecruiters, setAllRecruiters] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [
      { count: candidateCount },
      { count: recruiterCount },
      { count: verifiedCount },
      { count: pendingCount },
      { count: jobCount },
      { count: appCount },
      { count: placementCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'candidate'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'recruiter'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'recruiter').eq('verification_status', 'verified'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'recruiter').eq('verification_status', 'pending'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'offered'),
    ])

    setStats({
      candidates: candidateCount || 0,
      recruiters: recruiterCount || 0,
      verified: verifiedCount || 0,
      pending: pendingCount || 0,
      jobs: jobCount || 0,
      applications: appCount || 0,
      placements: placementCount || 0,
    })

    // Pending recruiters — fetch from profiles directly (more reliable than verification_requests join)
    const { data: pendingRecruiters } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'recruiter')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: false })
    setRequests(pendingRecruiters || [])

    // All jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setAllJobs(jobs || [])

    // All recruiters
    const { data: recs } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'recruiter')
      .order('created_at', { ascending: false })
    setAllRecruiters(recs || [])

    setLoading(false)
  }

  async function approveRecruiter(recruiterId) {
    setActionLoading(recruiterId)
    try {
      const { error } = await supabase.from('profiles').update({
        verification_status: 'verified',
        verified_by: profile.id,
        verification_note: 'Approved by TPO',
        verified_at: new Date().toISOString(),
      }).eq('id', recruiterId)

      if (error) throw error

      // Also update any pending verification request
      await supabase.from('verification_requests')
        .update({ status: 'approved', reason: 'Approved by TPO', reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
        .eq('recruiter_id', recruiterId)
        .eq('status', 'pending')

      toast.success('Recruiter approved!')
      await loadData()
    } catch (err) {
      toast.error('Failed to approve: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function rejectRecruiter(recruiterId) {
    const reason = prompt('Reason for rejection:')
    if (!reason) return

    setActionLoading(recruiterId)
    try {
      const { error } = await supabase.from('profiles').update({
        verification_status: 'rejected',
        verified_by: profile.id,
        verification_note: reason,
        verified_at: new Date().toISOString(),
      }).eq('id', recruiterId)

      if (error) throw error

      await supabase.from('verification_requests')
        .update({ status: 'rejected', reason, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
        .eq('recruiter_id', recruiterId)
        .eq('status', 'pending')

      toast.success('Recruiter rejected')
      await loadData()
    } catch (err) {
      toast.error('Failed to reject: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function revokeRecruiter(recruiterId) {
    if (!confirm('Revoke this recruiter\'s access? They won\'t be able to post jobs.')) return
    setActionLoading(recruiterId)
    try {
      const { error } = await supabase.from('profiles').update({
        verification_status: 'rejected',
        verification_note: 'Access revoked by TPO',
        verified_by: profile.id,
        verified_at: new Date().toISOString(),
      }).eq('id', recruiterId)
      if (error) throw error
      toast.success('Recruiter access revoked')
      await loadData()
    } catch (err) {
      toast.error('Failed: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function removeJob(jobId) {
    if (!confirm('Remove this job listing?')) return
    await supabase.from('jobs').update({ is_active: false }).eq('id', jobId)
    toast.success('Job deactivated')
    setAllJobs(prev => prev.map(j => j.id === jobId ? { ...j, is_active: false } : j))
  }

  async function exportApplicationsToCSV() {
    toast.loading('Fetching all application data...')
    try {
      const { data: apps, error } = await supabase
        .from('applications')
        .select('*, jobs(title, company_name, location, job_type, skills_required), profiles(full_name, email, skills, candidate_year, education, skills_verified)')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!apps?.length) { toast.dismiss(); toast.error('No applications to export'); return }

      // Build CSV
      const headers = [
        'Application ID', 'Job Title', 'Company', 'Location', 'Job Type',
        'Candidate Name', 'Candidate Email', 'Candidate Skills', 'Year of Study', 'Education', 'Skills Verified',
        'Status', 'Match Score', 'Match Reasoning', 'Cover Letter',
        'Applied Date'
      ]

      const rows = apps.map(app => [
        app.id,
        app.jobs?.title || '',
        app.jobs?.company_name || '',
        app.jobs?.location || '',
        app.jobs?.job_type || '',
        app.profiles?.full_name || '',
        app.profiles?.email || '',
        (app.profiles?.skills || []).join('; '),
        app.profiles?.candidate_year ? app.profiles.candidate_year + ['st','nd','rd','th'][Math.min(app.profiles.candidate_year - 1, 3)] + ' year' : '',
        app.profiles?.education || '',
        (app.profiles?.skills_verified || []).join('; '),
        app.status,
        app.match_score != null ? Math.round(app.match_score) : '',
        app.match_reasoning || '',
        (app.cover_letter || '').replace(/[\n\r,]/g, ' '),
        app.created_at ? new Date(app.created_at).toLocaleDateString() : '',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `talentbridge_applications_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.dismiss()
      toast.success(`Exported ${apps.length} applications to CSV`)
    } catch (err) {
      toast.dismiss()
      toast.error('Export failed: ' + err.message)
    }
  }

  if (loading) return <LoadingSpinner className="min-h-screen" size="lg" />

  const TABS = [
    { id: 'requests', label: 'Pending Requests', count: stats.pending },
    { id: 'recruiters', label: 'All Recruiters', count: stats.recruiters },
    { id: 'jobs', label: 'All Jobs', count: stats.jobs },
    { id: 'stats', label: 'Platform Stats' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">TPO Dashboard</h1>
            <p className="text-sm text-primary/50">Platform administration & recruiter verification</p>
          </div>
        </div>
        <button onClick={exportApplicationsToCSV} className="btn-accent py-2.5 px-5">
          <Download className="w-4 h-4" /> Export All Applications (CSV)
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatsCard title="Students" value={stats.candidates} icon={Users} color="blue" />
        <StatsCard title="Verified Recruiters" value={stats.verified} icon={CheckCircle2} color="green" />
        <StatsCard title="Pending Requests" value={stats.pending} icon={Clock} color="orange" />
        <StatsCard title="Placements" value={stats.placements} icon={BarChart3} color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${tab === t.id ? 'bg-accent/10 text-accent' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Pending Requests */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="card text-center py-12">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-500">No pending verification requests</p>
            </div>
          ) : requests.map(rec => (
            <div key={rec.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{rec.full_name}</h4>
                  <p className="text-sm text-slate-500">{rec.email}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    {rec.company_name && <p><span className="font-medium text-slate-700">Company:</span> {rec.company_name}</p>}
                    {rec.company_website && <p><span className="font-medium text-slate-700">Website:</span> <a href={rec.company_website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{rec.company_website}</a></p>}
                    {rec.company_email && <p><span className="font-medium text-slate-700">Company Email:</span> {rec.company_email}</p>}
                    {rec.company_description && <p className="text-slate-600 mt-1">{rec.company_description}</p>}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Registered {new Date(rec.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => approveRecruiter(rec.id)}
                    disabled={actionLoading === rec.id}
                    className="btn-accent py-1.5 px-4 text-xs disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {actionLoading === rec.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => rejectRecruiter(rec.id)}
                    disabled={actionLoading === rec.id}
                    className="btn-danger py-1.5 px-4 text-xs disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Recruiters */}
      {tab === 'recruiters' && (
        <div className="space-y-3">
          {allRecruiters.length === 0 ? (
            <div className="card text-center py-12"><p className="text-slate-500">No recruiters yet</p></div>
          ) : allRecruiters.map(rec => (
            <div key={rec.id} className="card flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-900">{rec.full_name}</h4>
                  <span className={`badge text-xs ${
                    rec.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                    rec.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    rec.verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>{rec.verification_status || 'unverified'}</span>
                </div>
                <p className="text-sm text-slate-500">{rec.email} {rec.company_name && `• ${rec.company_name}`}</p>
              </div>
              <div className="flex gap-2">
                {rec.verification_status === 'verified' && (
                  <button onClick={() => revokeRecruiter(rec.id)} disabled={actionLoading === rec.id}
                    className="text-red-500 hover:text-red-600 text-xs font-medium flex items-center gap-1 disabled:opacity-50">
                    <Ban className="w-3.5 h-3.5" /> Revoke
                  </button>
                )}
                {(rec.verification_status === 'rejected' || rec.verification_status === 'unverified') && (
                  <button onClick={() => approveRecruiter(rec.id)} disabled={actionLoading === rec.id}
                    className="text-accent hover:text-accent-dark text-xs font-medium flex items-center gap-1 disabled:opacity-50">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                )}
                {rec.verification_status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => approveRecruiter(rec.id)} disabled={actionLoading === rec.id}
                      className="text-accent hover:text-accent-dark text-xs font-medium flex items-center gap-1 disabled:opacity-50">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => rejectRecruiter(rec.id)} disabled={actionLoading === rec.id}
                      className="text-red-500 hover:text-red-600 text-xs font-medium flex items-center gap-1 disabled:opacity-50">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Jobs */}
      {tab === 'jobs' && (
        <div className="space-y-3">
          {allJobs.length === 0 ? (
            <div className="card text-center py-12"><p className="text-slate-500">No jobs posted yet</p></div>
          ) : allJobs.map(job => (
            <div key={job.id} className="card flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Link to={`/jobs/${job.id}`} className="font-semibold text-slate-900 hover:text-accent">{job.title}</Link>
                  {!job.is_active && <span className="badge bg-slate-100 text-slate-500 text-xs">Inactive</span>}
                </div>
                <p className="text-sm text-slate-500">{job.company_name} • {job.location} • {job.application_count || 0} applicants</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/jobs/${job.id}`} className="text-slate-400 hover:text-accent"><Eye className="w-4 h-4" /></Link>
                {job.is_active && (
                  <button onClick={() => removeJob(job.id)} className="text-slate-400 hover:text-red-500" title="Deactivate">
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Platform Stats */}
      {tab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4">Platform Overview</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Students', value: stats.candidates, color: 'text-blue-600' },
                { label: 'Total Recruiters', value: stats.recruiters, color: 'text-slate-700' },
                { label: 'Verified Recruiters', value: stats.verified, color: 'text-emerald-600' },
                { label: 'Pending Verification', value: stats.pending, color: 'text-amber-600' },
                { label: 'Active Jobs', value: stats.jobs, color: 'text-accent' },
                { label: 'Total Applications', value: stats.applications, color: 'text-purple-600' },
                { label: 'Placements (Offered)', value: stats.placements, color: 'text-emerald-600' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className={`font-mono font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4">Trust Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Recruiter Verification Rate</span>
                <span className="font-mono font-bold text-emerald-600">
                  {stats.recruiters > 0 ? Math.round((stats.verified / stats.recruiters) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Placement Rate</span>
                <span className="font-mono font-bold text-accent">
                  {stats.applications > 0 ? Math.round((stats.placements / stats.applications) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Avg Applications per Job</span>
                <span className="font-mono font-bold text-slate-700">
                  {stats.jobs > 0 ? Math.round(stats.applications / stats.jobs) : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
