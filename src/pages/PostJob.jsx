import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import JobForm from '../components/jobs/JobForm'
import { supabase } from '../lib/supabase'
import { sendStatusEmail } from '../lib/email'
import { Shield, Clock, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PostJob() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  // Block unverified recruiters
  if (profile?.verification_status === 'pending') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Verification Pending</h2>
        <p className="text-slate-500 mb-6">Your recruiter account is being reviewed by the TPO. You'll be able to post jobs once verified.</p>
        <Link to="/dashboard" className="btn-secondary">Go to Dashboard</Link>
      </div>
    )
  }

  if (profile?.verification_status === 'rejected') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-7 h-7 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Verification Rejected</h2>
        <p className="text-slate-500 mb-2">Your recruiter account was not approved.</p>
        {profile?.verification_note && <p className="text-sm text-red-600 mb-6">Reason: {profile.verification_note}</p>}
        <Link to="/dashboard" className="btn-secondary">Go to Dashboard</Link>
      </div>
    )
  }

  async function handleSubmit(formData) {
    setLoading(true)
    try {
      const { error } = await supabase.from('jobs').insert({
        ...formData,
        recruiter_id: user.uid,
        company_name: formData.company_name || profile?.company_name,
      })
      if (error) throw error
      toast.success('Job posted successfully!')

      // Notify matching candidates via email (async, don't block)
      if (formData.skills_required?.length > 0) {
        supabase.from('profiles').select('email, full_name, skills').eq('role', 'candidate').then(({ data: candidates }) => {
          if (!candidates?.length) return
          const matching = candidates.filter(c => {
            const cSkills = (c.skills || []).map(s => s.toLowerCase())
            return formData.skills_required.some(rs => cSkills.some(cs => cs.includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs)))
          })
          // Send email to first 10 matching candidates (EmailJS free tier limit)
          matching.slice(0, 10).forEach(c => {
            sendStatusEmail({
              candidateEmail: c.email,
              candidateName: c.full_name || 'Candidate',
              jobTitle: formData.title,
              companyName: formData.company_name || profile?.company_name || '',
              newStatus: 'new_job_alert',
            }).catch(() => {})
          })
          if (matching.length > 0) toast.success(`${matching.length} matching candidate${matching.length > 1 ? 's' : ''} notified!`)
        }).catch(() => {})
      }

      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Post a New Job</h1>
        {profile?.verification_status === 'verified' && (
          <span className="badge bg-emerald-100 text-emerald-700 text-xs"><Shield className="w-3 h-3 mr-0.5" /> Verified</span>
        )}
      </div>
      <div className="card">
        <JobForm onSubmit={handleSubmit} loading={loading} initialData={{ company_name: profile?.company_name || '' }} />
      </div>
    </div>
  )
}
