import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { MapPin, Clock, Building2, Briefcase, Users, Bookmark, BookmarkCheck, X, Edit3, Shield, CheckCircle2, XCircle, Lock, ArrowRight, Sparkles, Loader2, GraduationCap } from 'lucide-react'
import { timeAgo, formatSalary, STATUS_COLORS } from '../utils/helpers'
import { calculateMatchScore } from '../lib/scoring'
import { computeEligibility } from '../lib/eligibility'
import LoadingSpinner from '../components/common/LoadingSpinner'
import toast from 'react-hot-toast'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

export default function JobDetailPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState(null)
  const [saved, setSaved] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [generatingCL, setGeneratingCL] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => { fetchJob() }, [id])
  useEffect(() => { if (user) { checkApplication(); checkSaved() } }, [user, id])

  async function fetchJob() {
    const { data } = await supabase.from('jobs').select('*, profiles(full_name, company_name)').eq('id', id).single()
    setJob(data)
    setLoading(false)
  }

  async function checkApplication() {
    const { data } = await supabase.from('applications').select('*').eq('job_id', id).eq('candidate_id', user.uid).maybeSingle()
    setApplication(data)
  }

  async function checkSaved() {
    const { data } = await supabase.from('saved_jobs').select('id').eq('job_id', id).eq('candidate_id', user.uid).maybeSingle()
    setSaved(!!data)
  }

  async function toggleSave() {
    if (saved) {
      await supabase.from('saved_jobs').delete().eq('candidate_id', user.uid).eq('job_id', id)
    } else {
      await supabase.from('saved_jobs').insert({ candidate_id: user.uid, job_id: id })
    }
    setSaved(!saved)
  }

  function getProfileCompletion() {
    if (!profile) return 0
    const fields = ['full_name', 'location', 'bio', 'skills', 'candidate_year', 'education', 'resume_url']
    const filled = fields.filter(f => { const v = profile[f]; return Array.isArray(v) ? v.length > 0 : !!v })
    return Math.round((filled.length / fields.length) * 100)
  }

  async function handleApply(e) {
    e.preventDefault()

    // Year-based restriction: 2nd/3rd year can only apply to internships
    if (profile?.candidate_year && profile.candidate_year <= 3 && job.job_type !== 'internship') {
      toast.error(`As a ${profile.candidate_year}${['st','nd','rd'][profile.candidate_year - 1]} year student, you can only apply to internships.`)
      return
    }

    // Deadline check
    if (job.deadline && new Date(job.deadline) < new Date(new Date().toDateString())) {
      toast.error('Application deadline has passed for this job.')
      return
    }

    // Must have resume uploaded
    if (!profile?.resume_url) {
      toast.error('Upload your resume first via AI Resume Match.')
      return
    }

    // Must have skills on profile
    if (!profile?.skills?.length) {
      toast.error('Upload your resume to extract skills before applying.')
      return
    }

    // Skill verification gate — the ONLY real gate
    const elig = computeEligibility(profile, job)
    if (!elig.eligible) {
      toast.error(`Verify at least ${elig.needed} more skill(s) to apply. Take the skill quiz.`)
      return
    }

    setApplying(true)
    try {
      // Calculate match score based on profile vs job
      const matchResult = calculateMatchScore(profile, job)

      // Build quiz summary for recruiter
      const quizScores = profile?.quiz_scores || {}
      const quizSummary = Object.keys(quizScores).length > 0 ? quizScores : null

      const { error } = await supabase.from('applications').insert({
        job_id: id,
        candidate_id: user.uid,
        cover_letter: coverLetter || null,
        resume_url: profile?.resume_url || null,
        match_score: matchResult.score,
        match_reasoning: matchResult.reasoning,
        trust_score: profile?.trust_score || null,
        trust_flags: profile?.trust_flags || [],
        skills_quiz_summary: quizSummary,
      })
      if (error) throw error
      // Increment application count on the job
      await supabase.rpc('increment_application_count', { job_id_input: id }).catch(() => {
        // Fallback: manual increment if RPC doesn't exist
        supabase.from('jobs').update({ application_count: (job.application_count || 0) + 1 }).eq('id', id).then(() => {})
      })
      toast.success(`Application submitted! Match score: ${matchResult.score}%`)
      setShowApplyModal(false)
      checkApplication()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setApplying(false)
    }
  }

  if (loading) return <LoadingSpinner className="min-h-screen" size="lg" />
  if (!job) return <div className="text-center py-20"><p className="text-lg text-slate-500">Job not found.</p><Link to="/jobs" className="btn-accent mt-4 inline-block">Browse Jobs</Link></div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
        {/* Main Content */}
        <div className="flex-1">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-accent-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-slate-900">{job.title}</h1>
              <p className="text-lg text-slate-500">{job.company_name}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <span className="badge bg-accent-50 text-accent-700 capitalize"><Briefcase className="w-3 h-3 mr-1" />{job.job_type}</span>
            <span className="badge bg-slate-100 text-slate-600"><MapPin className="w-3 h-3 mr-1" />{job.location}</span>
            {job.target_years?.length > 0 && (
              <span className="badge bg-slate-100 text-slate-600">
                <GraduationCap className="w-3 h-3 mr-1" />{job.target_years.map(y => y + ['st','nd','rd','th'][Math.min(y-1,3)]).join(', ')} Year
              </span>
            )}
            <span className="badge bg-slate-100 text-slate-600"><Clock className="w-3 h-3 mr-1" />{timeAgo(job.created_at)}</span>
            <span className="badge bg-slate-100 text-slate-600"><Users className="w-3 h-3 mr-1" />{job.application_count} applicants</span>
          </div>

          <div className="prose prose-slate max-w-none mb-8">
            <h3 className="font-semibold text-lg text-slate-900 mb-3">Description</h3>
            <p className="whitespace-pre-wrap">{job.description}</p>
          </div>

          {job.requirements && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Requirements</h3>
              <p className="whitespace-pre-wrap text-slate-600">{job.requirements}</p>
            </div>
          )}

          {job.skills_required?.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills_required.map((skill) => (
                  <span key={skill} className="badge bg-accent-50 text-accent-700 py-1.5 px-3">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="sticky top-24 card space-y-4">
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-primary">{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</p>
              <p className="text-sm text-slate-500">per annum</p>
            </div>

            {/* Year restriction for 2nd/3rd year viewing non-internship */}
            {user && profile?.role === 'candidate' && profile?.candidate_year && profile.candidate_year <= 3 && job.job_type !== 'internship' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center mb-4">
                <GraduationCap className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-amber-800 mb-1">Not Available for Your Year</p>
                <p className="text-xs text-amber-600 mb-3">
                  This is a {job.job_type} role. As a {profile.candidate_year}{['st','nd','rd'][profile.candidate_year - 1]} year student, you can only apply to internships.
                </p>
                <Link to="/jobs" className="btn-secondary text-xs py-1.5 px-4">Browse Internships</Link>
              </div>
            )}

            {user && profile?.role === 'candidate' && (() => {
              const match = job ? calculateMatchScore(profile, job) : null
              const elig = job ? computeEligibility(profile, job) : null
              const hasResume = !!profile?.resume_url
              const yearBlocked = profile?.candidate_year && profile.candidate_year <= 3 && job.job_type !== 'internship'

              return (
                <>
                  {/* No resume uploaded */}
                  {!hasResume && !application && !yearBlocked && (
                    <div className="text-center p-3 bg-warm-100 border border-accent/20 rounded-lg">
                      <p className="text-xs text-primary/60 mb-2">Upload your resume to extract skills and apply.</p>
                      <Link to="/resume-match" className="btn-accent text-xs py-1.5 px-4">Upload Resume</Link>
                    </div>
                  )}

                  {/* Already applied */}
                  {application ? (
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500 mb-1">Your application status</p>
                      <span className={`badge capitalize ${STATUS_COLORS[application.status]}`}>{application.status}</span>
                      {application.match_score && (
                        <p className="text-xs text-slate-500 mt-2">Match: <span className="font-mono font-bold text-accent">{Math.round(application.match_score)}%</span></p>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Match Score */}
                      {match && profile?.skills?.length > 0 && (
                        <div className="text-center p-3 rounded-lg bg-slate-50">
                          <p className="text-xs text-slate-500 mb-1">Match Score</p>
                          <span className={`text-2xl font-mono font-bold ${match.score >= 75 ? 'text-emerald-500' : match.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{match.score}%</span>
                        </div>
                      )}

                      {/* Skill Verification Status */}
                      {elig && elig.totalRequired > 0 && (
                        <div className="rounded-lg border border-gray-200 p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Shield className="w-4 h-4 text-accent" />
                            <span className="text-xs font-semibold text-slate-900">Skill Verification</span>
                            <span className={`ml-auto text-xs font-mono font-bold ${elig.eligible ? 'text-emerald-600' : !elig.eligible ? 'text-red-600' : 'text-red-600'}`}>
                              {elig.verifiedCount}/{elig.totalRequired}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {elig.skills.map(s => (
                              <div key={s.skill} className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  {s.verified ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : s.claimed ? <XCircle className="w-3.5 h-3.5 text-amber-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}
                                  <span className={`text-xs ${s.verified ? 'text-slate-700' : 'text-slate-500'}`}>{s.skill}</span>
                                </div>
                                {s.verified ? (
                                  <span className="text-xs text-emerald-600 font-medium">Verified</span>
                                ) : s.claimed ? (
                                  <Link to={`/skill-quiz?skill=${encodeURIComponent(s.skill)}&returnTo=${encodeURIComponent(`/jobs/${id}`)}`} className="text-xs text-accent font-medium hover:underline flex items-center gap-0.5">
                                    Verify <ArrowRight className="w-2.5 h-2.5" />
                                  </Link>
                                ) : (
                                  <span className="text-xs text-slate-400">Not on profile</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Status message */}
                          <div className={`mt-2 pt-2 border-t text-xs ${elig.eligible ? 'border-emerald-100 text-emerald-700 bg-emerald-50' : 'border-red-100 text-red-700 bg-red-50'} rounded-md p-2`}>
                            {elig.eligible ? 'You\'re eligible to apply!' : `Verify ${elig.needed} more skill(s) to apply.`}
                          </div>
                        </div>
                      )}

                      {/* No skills on profile */}
                      {(!profile?.skills || profile.skills.length === 0) && (
                        <div className="text-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-700 mb-2">Add skills to your profile or upload your resume first.</p>
                          <div className="flex gap-2 justify-center">
                            <Link to="/profile" className="btn-secondary text-xs py-1 px-3">Profile</Link>
                            <Link to="/resume-match" className="btn-accent text-xs py-1 px-3">Upload Resume</Link>
                          </div>
                        </div>
                      )}

                      {/* Apply Button — honest gate */}
                      {job.deadline && new Date(job.deadline) < new Date(new Date().toDateString()) ? (
                        <button disabled className="w-full py-2 px-5 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-200 cursor-not-allowed flex items-center justify-center gap-2">
                          <Lock className="w-4 h-4" /> Deadline Expired
                        </button>
                      ) : !hasResume ? (
                        <Link to="/resume-match" className="w-full py-2 px-5 rounded-lg text-sm font-medium bg-warm-100 text-primary/60 border border-primary/10 flex items-center justify-center gap-2">
                          <Lock className="w-4 h-4" /> Upload Resume First
                        </Link>
                      ) : !elig?.eligible ? (
                        <button disabled className="w-full py-2 px-5 rounded-lg text-sm font-medium bg-primary/5 text-primary/40 cursor-not-allowed flex items-center justify-center gap-2">
                          <Lock className="w-4 h-4" /> Verify {elig?.needed || 0} More Skill{(elig?.needed || 0) > 1 ? 's' : ''} to Apply
                        </button>
                      ) : (
                        <button onClick={() => setShowApplyModal(true)} className="btn-accent w-full">Apply Now</button>
                      )}
                    </>
                  )}

                  <button onClick={toggleSave} className="btn-secondary w-full">
                    {saved ? <><BookmarkCheck className="w-4 h-4" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save Job</>}
                  </button>
                </>
              )
            })()}

            {user && profile?.role === 'recruiter' && job.recruiter_id === user.uid && (
              <Link to={`/edit-job/${job.id}`} className="btn-secondary w-full">
                <Edit3 className="w-4 h-4" /> Edit Job
              </Link>
            )}

            {!user && (
              <Link to="/login" className="btn-accent w-full text-center">Sign in to Apply</Link>
            )}

            <div className="border-t border-slate-200 pt-4 space-y-2 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">Posted:</span> {timeAgo(job.created_at)}</p>
              <p><span className="font-medium text-slate-900">Type:</span> <span className="capitalize">{job.job_type}</span></p>
              <p><span className="font-medium text-slate-900">Applications:</span> {job.application_count}</p>
              {job.deadline && (
                <p>
                  <span className="font-medium text-slate-900">Deadline:</span>{' '}
                  <span className={new Date(job.deadline) < new Date(new Date().toDateString()) ? 'text-red-600 font-medium' : 'text-primary/70'}>
                    {new Date(job.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {new Date(job.deadline) < new Date(new Date().toDateString()) && ' (Expired)'}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal with AI Cover Letter */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-primary">Apply to {job.title}</h3>
              <button onClick={() => setShowApplyModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Cover Letter</label>
                  <button type="button" disabled={generatingCL} onClick={async () => {
                    setGeneratingCL(true)
                    try {
                      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
                        body: JSON.stringify({
                          model: 'llama-3.3-70b-versatile', temperature: 0.6, max_tokens: 500,
                          messages: [{ role: 'user', content: `Write a professional cover letter for applying to "${job.title}" at ${job.company_name}.

Job requires: ${(job.skills_required || []).join(', ')}
Job description: ${(job.description || '').substring(0, 300)}

Candidate profile:
- Name: ${profile?.full_name || 'Candidate'}
- Skills: ${(profile?.skills || []).join(', ')}
- Year of Study: ${profile?.candidate_year ? profile.candidate_year + (['st','nd','rd','th'][Math.min(profile.candidate_year - 1, 3)]) + ' year' : 'Not specified'}
- Education: ${profile?.education || 'Not specified'}
- Verified skills: ${(profile?.skills_verified || []).join(', ') || 'None yet'}

Write 3-4 paragraphs. Be specific — reference the candidate's ACTUAL skills and the job's ACTUAL requirements. Show enthusiasm but stay professional. Do NOT include placeholders like [Company] — use real names. Return ONLY the cover letter text.` }],
                        }),
                      })
                      const data = await res.json()
                      const text = data.choices?.[0]?.message?.content || ''
                      setCoverLetter(text.trim())
                      toast.success('Cover letter generated!')
                    } catch { toast.error('Generation failed') }
                    finally { setGeneratingCL(false) }
                  }} className="text-xs text-accent hover:text-accent-dark font-medium flex items-center gap-1 disabled:opacity-50">
                    {generatingCL ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</> : <><Sparkles className="w-3 h-3" /> Generate with AI</>}
                  </button>
                </div>
                <textarea rows={6} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} className="input-field text-sm" placeholder="Write your cover letter or click 'Generate with AI'..." />
              </div>
              {profile?.resume_url && (
                <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Your resume will be attached automatically.</p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowApplyModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={applying} className="btn-accent flex-1">{applying ? 'Submitting...' : 'Submit Application'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
