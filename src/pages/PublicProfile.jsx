import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { CheckCircle2, Award, Shield, Briefcase, MapPin, GraduationCap, Star, Download, Copy, ExternalLink, Sparkles, Target, Brain, Share2 } from 'lucide-react'

function ScoreBadge({ score, size = 'md' }) {
  const n = Number(score) || 0
  const color = n >= 80 ? 'text-emerald-600' : n >= 60 ? 'text-blue-600' : n >= 40 ? 'text-amber-600' : 'text-red-600'
  const bg = n >= 80 ? 'bg-emerald-50 border-emerald-200' : n >= 60 ? 'bg-blue-50 border-blue-200' : n >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
  const sz = size === 'lg' ? 'w-20 h-20' : 'w-12 h-12'
  const font = size === 'lg' ? 'text-2xl' : 'text-sm'
  return (
    <div className={`${sz} rounded-full border-2 ${bg} flex items-center justify-center flex-shrink-0`}>
      <span className={`${font} font-bold font-mono ${color}`}>{n}</span>
    </div>
  )
}

function calcPlacementScore(profile, bestInterview) {
  let score = 0
  const verified = (profile?.skills_verified || []).length
  const totalSkills = (profile?.skills || []).length
  const skillScore = totalSkills > 0 ? Math.min(100, (verified / Math.max(totalSkills, 3)) * 100) : 0
  score += skillScore * 0.30

  const quizScores = profile?.quiz_scores || {}
  const quizEntries = Object.values(quizScores)
  const avgQuiz = quizEntries.length > 0 ? (quizEntries.reduce((s, q) => s + ((q.score || 0) / (q.total || 1)) * 100, 0) / quizEntries.length) : 0
  score += avgQuiz * 0.25

  score += (bestInterview || 0) * 0.25

  const fields = ['full_name', 'location', 'bio', 'skills', 'candidate_year', 'education', 'resume_url']
  const filled = fields.filter(f => { const v = profile?.[f]; return Array.isArray(v) ? v.length > 0 : !!v }).length
  score += ((filled / fields.length) * 100) * 0.20

  return Math.round(Math.max(0, Math.min(100, score)))
}

export default function PublicProfile() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [interviews, setInterviews] = useState([])
  const [quizHistory, setQuizHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef()

  const profileUrl = `${window.location.origin}/u/${id}`

  useEffect(() => {
    async function load() {
      // Fetch profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!prof || prof.role !== 'candidate') {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProfile(prof)

      // Fetch interview sessions
      const { data: sessions } = await supabase
        .from('interview_sessions')
        .select('id, job_title, company_name, overall_score, grade, questions_answered, created_at')
        .eq('candidate_id', id)
        .order('overall_score', { ascending: false })
        .limit(5)

      setInterviews(sessions || [])

      // Fetch quiz history
      const { data: quizzes } = await supabase
        .from('skill_quizzes')
        .select('id, skill, score, total, passed, created_at')
        .eq('candidate_id', id)
        .order('created_at', { ascending: false })
        .limit(20)

      setQuizHistory(quizzes || [])

      setLoading(false)
    }
    load()
  }, [id])

  function copyLink() {
    navigator.clipboard.writeText(profileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadQR() {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `placemate-${profile?.full_name?.replace(/\s+/g, '-').toLowerCase() || id}.png`
    a.click()
  }

  if (loading) return <LoadingSpinner className="min-h-screen" size="lg" />

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Profile Not Found</h1>
          <p className="text-slate-500 mb-6">This verified profile doesn't exist or isn't public.</p>
          <Link to="/" className="btn-accent py-2.5 px-6">Go to PlaceMate</Link>
        </div>
      </div>
    )
  }

  const verifiedSkills = profile?.skills_verified || []
  const allSkills = profile?.skills || []
  const quizScores = profile?.quiz_scores || {}
  const bestInterview = interviews.length > 0 ? interviews[0] : null
  const placementScore = calcPlacementScore(profile, bestInterview?.overall_score || 0)

  // Build verified skill details from quiz_scores + quiz history
  const skillDetails = verifiedSkills.map(skill => {
    const qs = quizScores[skill] || quizScores[skill.toLowerCase()] || {}
    const quiz = quizHistory.find(q => q.skill?.toLowerCase() === skill.toLowerCase() && q.passed)
    return {
      skill,
      score: qs.score || quiz?.score || 0,
      total: qs.total || quiz?.total || 5,
      date: quiz?.created_at || null,
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Top bar */}
      <nav className="bg-primary sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between h-12 items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center">
                <Briefcase className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm text-white">PlaceMate</span>
              <span className="text-xs text-white/40 ml-1">Verified Profile</span>
            </Link>
            <div className="flex items-center gap-2">
              <button onClick={copyLink} className="text-xs text-white/60 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <Link to="/register" className="btn-accent py-1 px-3 text-xs">Join PlaceMate</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* ── Hero Card ── */}
          <div className="bg-white rounded-2xl shadow-lg border border-primary/5 overflow-hidden mb-6">
            {/* Gradient header */}
            <div className="bg-gradient-to-r from-primary via-slate-800 to-primary h-28 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-accent/10" />
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
            </div>

            <div className="px-6 pb-6 -mt-12 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-white">
                  {(profile.full_name || '?')[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-primary">{profile.full_name || 'Candidate'}</h1>
                    {verifiedSkills.length > 0 && (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        <Shield className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-primary/50">
                    {profile.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {profile.location}</span>}
                    {profile.education && <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {profile.education}</span>}
                    {profile.candidate_year != null && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {profile.candidate_year}{['st','nd','rd','th'][Math.min(profile.candidate_year - 1, 3)]} Year</span>}
                  </div>
                  {profile.bio && <p className="text-sm text-primary/60 mt-2 max-w-xl">{profile.bio}</p>}
                </div>

                {/* QR Code — desktop */}
                <div ref={qrRef} className="hidden sm:block flex-shrink-0 text-center">
                  <div className="bg-white rounded-xl border border-primary/10 p-2 shadow-sm">
                    <QRCodeCanvas
                      value={profileUrl}
                      size={96}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <button onClick={downloadQR} className="text-xs text-primary/30 hover:text-accent mt-1 flex items-center gap-1 mx-auto">
                    <Download className="w-3 h-3" /> Save QR
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-primary/5 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold font-mono text-accent">{verifiedSkills.length}</p>
              <p className="text-xs text-primary/40 mt-0.5">Skills Verified</p>
            </div>
            <div className="bg-white rounded-xl border border-primary/5 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold font-mono text-purple-600">{allSkills.length}</p>
              <p className="text-xs text-primary/40 mt-0.5">Total Skills</p>
            </div>
            <div className="bg-white rounded-xl border border-primary/5 p-4 text-center shadow-sm">
              <p className={`text-2xl font-bold font-mono ${placementScore >= 70 ? 'text-emerald-600' : placementScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{placementScore}%</p>
              <p className="text-xs text-primary/40 mt-0.5">Placement Score</p>
            </div>
            <div className="bg-white rounded-xl border border-primary/5 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold font-mono text-blue-600">{bestInterview?.overall_score || '—'}</p>
              <p className="text-xs text-primary/40 mt-0.5">Best Interview</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* ── Verified Skills ── */}
              {verifiedSkills.length > 0 && (
                <div className="bg-white rounded-2xl border border-primary/5 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Verified Skills
                  </h2>
                  <p className="text-xs text-primary/40 mb-4">Each skill proven via timed quiz — no self-reporting</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {skillDetails.map(({ skill, score, total, date }) => {
                      const pct = total > 0 ? Math.round((score / total) * 100) : 0
                      return (
                        <div key={skill} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-primary truncate">{skill}</p>
                              <span className="text-xs font-bold font-mono text-emerald-600">{score}/{total}</span>
                            </div>
                            <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-1">
                              <div className="bg-emerald-500 rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            {date && <p className="text-xs text-primary/30 mt-0.5">Verified {new Date(date).toLocaleDateString()}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── All Skills ── */}
              {allSkills.length > 0 && (
                <div className="bg-white rounded-2xl border border-primary/5 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" /> All Skills
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {allSkills.map(s => {
                      const isVerified = verifiedSkills.some(v => v.toLowerCase() === s.toLowerCase())
                      return (
                        <span key={s} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                          isVerified ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {isVerified && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {s}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Mock Interview Performance ── */}
              {interviews.length > 0 && (
                <div className="bg-white rounded-2xl border border-primary/5 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" /> Interview Performance
                  </h2>
                  <p className="text-xs text-primary/40 mb-4">AI-graded mock interviews with detailed scoring</p>

                  <div className="space-y-3">
                    {interviews.map(session => (
                      <div key={session.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-primary/5">
                        <ScoreBadge score={session.overall_score} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-primary">{session.job_title}</p>
                          <p className="text-xs text-primary/40">{session.company_name} — {session.questions_answered || 0} questions</p>
                          <p className="text-xs text-primary/30 mt-0.5">{new Date(session.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {session.grade && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              (session.overall_score || 0) >= 70 ? 'bg-emerald-100 text-emerald-700' : (session.overall_score || 0) >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>{session.grade}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right sidebar ── */}
            <div className="space-y-6">

              {/* QR Code — mobile + large display */}
              <div className="bg-white rounded-2xl border border-primary/5 shadow-sm p-6 text-center">
                <h3 className="text-sm font-bold text-primary mb-3 flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4 text-accent" /> Share This Profile
                </h3>
                <div className="inline-block bg-white rounded-xl border-2 border-primary/10 p-3 shadow-inner" ref={qrRef}>
                  <QRCodeCanvas
                    value={profileUrl}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-xs text-primary/30 mt-3 mb-3">Scan to view this verified profile</p>
                <div className="flex gap-2">
                  <button onClick={downloadQR} className="btn-secondary text-xs py-2 px-3 flex-1 flex items-center justify-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Download QR
                  </button>
                  <button onClick={copyLink} className="btn-accent text-xs py-2 px-3 flex-1 flex items-center justify-center gap-1">
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* Placement Score */}
              <div className="bg-gradient-to-br from-primary to-slate-800 rounded-2xl p-6 text-center text-white">
                <Target className="w-6 h-6 text-accent-300 mx-auto mb-2" />
                <p className="text-xs text-white/50 mb-1">Placement Probability</p>
                <p className="text-4xl font-bold font-mono">{placementScore}<span className="text-lg text-white/50">%</span></p>
                <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                  <div className={`rounded-full h-2 transition-all ${placementScore >= 70 ? 'bg-emerald-400' : placementScore >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${placementScore}%` }} />
                </div>
                <p className="text-xs text-white/40 mt-2">
                  {placementScore >= 80 ? 'Excellent candidate' : placementScore >= 60 ? 'Strong candidate' : placementScore >= 40 ? 'Growing candidate' : 'Early stage'}
                </p>
              </div>

              {/* Verification Trust Markers */}
              <div className="bg-white rounded-2xl border border-primary/5 shadow-sm p-5">
                <h3 className="text-sm font-bold text-primary mb-3">Trust Markers</h3>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${verifiedSkills.length > 0 ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {verifiedSkills.length > 0 ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                    </div>
                    <span className="text-xs text-primary/60">Skills verified via quiz</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${interviews.length > 0 ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {interviews.length > 0 ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                    </div>
                    <span className="text-xs text-primary/60">Mock interview completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${profile.resume_url ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {profile.resume_url ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                    </div>
                    <span className="text-xs text-primary/60">Resume uploaded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${profile.education ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {profile.education ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                    </div>
                    <span className="text-xs text-primary/60">Education listed</span>
                  </div>
                </div>
              </div>

              {/* Quiz History */}
              {quizHistory.length > 0 && (
                <div className="bg-white rounded-2xl border border-primary/5 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" /> Quiz History
                  </h3>
                  <div className="space-y-2">
                    {quizHistory.slice(0, 8).map(q => (
                      <div key={q.id} className="flex items-center justify-between text-xs">
                        <span className="text-primary/60 truncate flex-1">{q.skill}</span>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="font-mono font-bold text-primary">{q.score}/{q.total}</span>
                          {q.passed ? (
                            <span className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center"><CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /></span>
                          ) : (
                            <span className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xs font-bold">x</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="mt-8 text-center border-t border-primary/5 pt-6 pb-4">
            <p className="text-xs text-primary/30">
              All skills and scores verified on <span className="font-semibold text-accent">PlaceMate</span> — a trusted campus hiring ecosystem
            </p>
            <p className="text-xs text-primary/20 mt-1">Profile generated on {new Date().toLocaleDateString()}</p>
          </div>

        </motion.div>
      </div>
    </div>
  )
}
