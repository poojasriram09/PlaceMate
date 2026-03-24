import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Briefcase, Mail, Lock, User, Building2, Shield, Globe, FileText, GraduationCap } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = [
  { id: 'candidate', label: 'Student', icon: User, desc: 'Looking for jobs & internships' },
  { id: 'recruiter', label: 'Recruiter', icon: Building2, desc: 'Hiring candidates' },
  { id: 'tpo', label: 'TPO', icon: Shield, desc: 'Training & Placement Officer' },
]

export default function Register() {
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', role: 'candidate',
    candidateYear: '',
    companyName: '', companyWebsite: '', companyEmail: '', companyDescription: '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const newUser = await signUp(form)

      // If recruiter, auto-create verification request
      if (form.role === 'recruiter' && newUser) {
        try { await supabase.from('verification_requests').insert({ recruiter_id: newUser.uid, company_name: form.companyName, company_website: form.companyWebsite || null, company_email: form.companyEmail || form.email, company_description: form.companyDescription || null }) } catch {}

        // Update profile with pending status
        try { await supabase.from('profiles').update({ verification_status: 'pending', company_website: form.companyWebsite || null, company_email: form.companyEmail || null, company_description: form.companyDescription || null }).eq('id', newUser.uid) } catch {}

        toast.success('Account created! Your recruiter profile is pending TPO verification.')
        navigate('/dashboard')
      } else {
        toast.success('Account created! Welcome to PlaceMate.')
        navigate(form.role === 'tpo' ? '/tpo' : '/profile')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 mt-1">Join PlaceMate</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <button
            onClick={async () => {
              localStorage.setItem('jobnexus_signup_role', form.role)
              try {
                await signInWithGoogle()
                toast.success('Account created!')
                navigate(form.role === 'tpo' ? '/tpo' : '/profile')
              } catch (err) {
                if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') toast.error(err.message)
              }
            }}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2.5 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors mb-5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">or register with email</span></div>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-5">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setForm({ ...form, role: r.id })}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  form.role === r.id ? 'border-accent bg-accent/10' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <r.icon className={`w-5 h-5 mx-auto mb-1 ${form.role === r.id ? 'text-accent' : 'text-slate-400'}`} />
                <p className="text-xs font-semibold">{r.label}</p>
                <p className="text-xs text-slate-400 leading-tight mt-0.5">{r.desc}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-field pl-10" placeholder="John Doe" />
              </div>
            </div>

            {/* Candidate year selection */}
            {form.role === 'candidate' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Year of Study *</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { value: 1, label: '1st Year' },
                    { value: 2, label: '2nd Year' },
                    { value: 3, label: '3rd Year' },
                    { value: 4, label: '4th Year' },
                  ].map(y => (
                    <button key={y.value} type="button" onClick={() => setForm({ ...form, candidateYear: y.value })}
                      className={`py-2 px-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                        form.candidateYear === y.value ? 'border-accent bg-accent/10 text-accent' : 'border-gray-200 text-slate-500 hover:border-gray-300'
                      }`}>
                      <GraduationCap className={`w-4 h-4 mx-auto mb-0.5 ${form.candidateYear === y.value ? 'text-accent' : 'text-slate-400'}`} />
                      {y.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {form.candidateYear && form.candidateYear <= 3
                    ? 'You will see internship opportunities'
                    : form.candidateYear === 4
                    ? 'You will see internships and full-time jobs'
                    : 'Select your current year'}
                </p>
              </div>
            )}

            {/* Recruiter-specific fields */}
            {form.role === 'recruiter' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="input-field pl-10" placeholder="TechCorp India" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="url" value={form.companyWebsite} onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })} className="input-field pl-10" placeholder="https://company.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} className="input-field pl-10" placeholder="hr@company.com" />
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Your recruiter account will be reviewed by the TPO before you can post jobs. This ensures a trusted hiring environment.
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field pl-10" placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field pl-10" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-accent w-full">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account? <Link to="/login" className="text-accent font-medium hover:text-accent-dark">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
