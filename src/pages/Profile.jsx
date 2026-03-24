import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { X, Plus, Upload, CheckCircle2 } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Profile() {
  const { profile, updateProfile, loading: authLoading } = useAuth()
  const [form, setForm] = useState({})
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        location: profile.location || '',
        bio: profile.bio || '',
        skills: profile.skills || [],
        candidate_year: profile.candidate_year || '',
        education: profile.education || '',
        company_name: profile.company_name || '',
        company_website: profile.company_website || '',
      })
    }
  }, [profile])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({
        ...form,
        candidate_year: form.candidate_year ? Number(form.candidate_year) : null,
      })
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  function addSkill() {
    if (skillInput.trim() && !form.skills.includes(skillInput.trim())) {
      setForm((prev) => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }))
      setSkillInput('')
    }
  }

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fileName = `${profile.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('resumes').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError
      await updateProfile({ resume_url: fileName })
      toast.success('Resume uploaded!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  // Compute profile completion
  function getCompletion() {
    if (!profile) return 0
    const fields = profile.role === 'candidate'
      ? ['full_name', 'location', 'bio', 'skills', 'candidate_year', 'education', 'resume_url']
      : ['full_name', 'company_name', 'company_website', 'location', 'bio']
    const filled = fields.filter(f => {
      const val = profile[f]
      return Array.isArray(val) ? val.length > 0 : !!val
    })
    return Math.round((filled.length / fields.length) * 100)
  }

  if (authLoading) return <LoadingSpinner className="min-h-screen" size="lg" />

  const completion = getCompletion()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">My Profile</h1>
      <p className="text-slate-500 mb-6 capitalize">{profile?.role} Profile</p>

      {/* Completion indicator */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Profile Completion</span>
          <span className="text-sm font-mono font-bold text-accent">{completion}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div className="bg-accent rounded-full h-2 transition-all duration-500" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <form onSubmit={handleSave} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input value={form.full_name || ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="+91..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" placeholder="Mumbai, India" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
          <textarea rows={3} value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="input-field" placeholder="Tell us about yourself..." />
        </div>

        {/* Candidate-specific fields */}
        {profile?.role === 'candidate' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Skills</label>
              <div className="flex gap-2 mb-2">
                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} className="input-field" placeholder="Type a skill and press Enter" />
                <button type="button" onClick={addSkill} className="btn-secondary py-2 px-3"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.skills || []).map((skill) => (
                  <span key={skill} className="badge bg-accent/10 text-accent-700 flex items-center gap-1 py-1 px-2.5">
                    {skill}
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year of Study</label>
                <select value={form.candidate_year || ''} onChange={(e) => setForm({ ...form, candidate_year: e.target.value })} className="input-field">
                  <option value="">Select year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
                {form.candidate_year && Number(form.candidate_year) <= 3 && (
                  <p className="text-xs text-amber-600 mt-1">Internship opportunities will be shown</p>
                )}
                {form.candidate_year && Number(form.candidate_year) === 4 && (
                  <p className="text-xs text-emerald-600 mt-1">Internships + full-time jobs will be shown</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Education</label>
                <input value={form.education || ''} onChange={(e) => setForm({ ...form, education: e.target.value })} className="input-field" placeholder="B.Tech - RGIT Mumbai" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Resume</label>
              {profile?.resume_url ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600 mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Resume uploaded
                </div>
              ) : null}
              <label className={`flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
                <span className="btn-secondary text-sm py-2 px-4"><Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Resume (PDF)'}</span>
                <input type="file" accept=".pdf" onChange={handleResumeUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
          </>
        )}

        {/* Recruiter-specific fields */}
        {profile?.role === 'recruiter' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
              <input value={form.company_name || ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Website</label>
              <input value={form.company_website || ''} onChange={(e) => setForm({ ...form, company_website: e.target.value })} className="input-field" placeholder="https://..." />
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-accent w-full">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
