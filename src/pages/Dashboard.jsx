import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import StatsCard from '../components/dashboard/StatsCard'
import ApplicationCard from '../components/applications/ApplicationCard'
import ApplicationStatus from '../components/applications/ApplicationStatus'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { rankCandidates as aiRankCandidates } from '../lib/ai'
import { sendStatusEmail } from '../lib/email'
import { Briefcase, FileText, Users, Award, Eye, Star, BarChart3, Trash2, Edit3, ChevronDown, ChevronUp, MessageSquare, CheckCircle2, ArrowRight, GripVertical, LayoutGrid, Share2, Copy, QrCode, Target, TrendingUp, Flame, Minus } from 'lucide-react'
import { motion } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'
import toast from 'react-hot-toast'

function calcPlacementPrediction(profile, stats, mockInterviews) {
  let score = 0

  // Skills verified (30% weight)
  const verified = (profile?.skills_verified || []).length
  const totalSkills = (profile?.skills || []).length
  const skillScore = totalSkills > 0 ? Math.min(100, (verified / Math.max(totalSkills, 3)) * 100) : 0
  score += skillScore * 0.30

  // Quiz avg score (25% weight)
  const quizScores = profile?.quiz_scores || {}
  const quizEntries = Object.values(quizScores)
  const avgQuiz = quizEntries.length > 0 ? (quizEntries.reduce((s, q) => s + ((q.score || 0) / (q.total || 1)) * 100, 0) / quizEntries.length) : 0
  score += avgQuiz * 0.25

  // Interview score (25% weight)
  const bestInterview = mockInterviews.length > 0 ? Math.max(...mockInterviews.map(s => s.overall_score || 0)) : 0
  score += bestInterview * 0.25

  // Profile completeness (20% weight)
  const fields = ['full_name', 'location', 'bio', 'skills', 'candidate_year', 'education', 'resume_url']
  const filled = fields.filter(f => { const v = profile?.[f]; return Array.isArray(v) ? v.length > 0 : !!v }).length
  const completeness = (filled / fields.length) * 100
  score += completeness * 0.20

  return Math.round(Math.max(0, Math.min(100, score)))
}

function CandidateDashboard({ user, profile }) {
  const [allApps, setAllApps] = useState([])
  const [mockInterviews, setMockInterviews] = useState([])
  const [skillDemand, setSkillDemand] = useState([])
  const [rankings, setRankings] = useState([])
  const [weeklyData, setWeeklyData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: apps }, { data: sessions }] = await Promise.all([
        supabase.from('applications').select('*, jobs(id, title, company_name, skills_required)').eq('candidate_id', user.uid).order('created_at', { ascending: false }),
        supabase.from('interview_sessions').select('*').eq('candidate_id', user.uid).order('created_at', { ascending: false }).limit(5),
      ])
      const a = apps || []
      setAllApps(a)
      setMockInterviews(sessions || [])

      // Skill demand heatmap
      const { data: activeJobs } = await supabase.from('jobs').select('skills_required').eq('is_active', true)
      const counts = {}
      for (const j of (activeJobs || [])) for (const s of (j.skills_required || [])) { const k = s.trim(); if (k) counts[k] = (counts[k] || 0) + 1 }
      const mySkills = (profile?.skills || []).map(s => s.toLowerCase())
      setSkillDemand(Object.entries(counts).map(([skill, count]) => ({ skill, count, hasSkill: mySkills.some(ms => ms.includes(skill.toLowerCase()) || skill.toLowerCase().includes(ms)) })).sort((a, b) => b.count - a.count))

      // Rankings
      const jobIds = [...new Set(a.map(x => x.jobs?.id).filter(Boolean))]
      const rd = []
      for (const jid of jobIds.slice(0, 3)) {
        const app = a.find(x => x.jobs?.id === jid)
        if (!app) continue
        const { data: ja } = await supabase.from('applications').select('candidate_id, match_score').eq('job_id', jid).order('match_score', { ascending: false, nullsFirst: false })
        if (!ja?.length) continue
        const idx = ja.findIndex(x => x.candidate_id === user.uid)
        if (idx === -1) continue
        rd.push({ jobId: jid, jobTitle: app.jobs?.title || '?', company: app.jobs?.company_name || '', rank: idx + 1, totalApplicants: ja.length, percentile: ja.length > 1 ? Math.round(((ja.length - idx - 1) / (ja.length - 1)) * 100) : 100 })
      }
      setRankings(rd)

      // Weekly progress
      const weeks = []
      const now = new Date()
      for (let w = 3; w >= 0; w--) {
        const ws = new Date(now); ws.setDate(now.getDate() - (w + 1) * 7)
        const we = new Date(now); we.setDate(now.getDate() - w * 7)
        weeks.push({
          label: w === 0 ? 'This week' : w === 1 ? 'Last week' : `${w + 1}w ago`,
          applied: a.filter(x => { const d = new Date(x.created_at); return d >= ws && d < we }).length,
          interviews: a.filter(x => ['interview','offered'].includes(x.status) && new Date(x.updated_at || x.created_at) >= ws && new Date(x.updated_at || x.created_at) < we).length,
          offers: a.filter(x => x.status === 'offered' && new Date(x.updated_at || x.created_at) >= ws && new Date(x.updated_at || x.created_at) < we).length,
        })
      }
      setWeeklyData(weeks)

      setLoading(false)
    }
    load()
  }, [user.uid])

  if (loading) return <LoadingSpinner className="py-20" size="lg" />

  const stats = {
    total: allApps.length,
    interviews: allApps.filter(a => a.status === 'interview').length,
    shortlisted: allApps.filter(a => a.status === 'shortlisted').length,
    offers: allApps.filter(a => a.status === 'offered').length,
  }
  const bestScore = mockInterviews.length > 0 ? Math.max(...mockInterviews.map(s => s.overall_score || 0)) : null
  const prediction = calcPlacementPrediction(profile, stats, mockInterviews)
  const verifiedCount = (profile?.skills_verified || []).length
  const totalSkills = (profile?.skills || []).length
  const responseRate = stats.total > 0 ? Math.round((allApps.filter(a => a.status !== 'applied').length / stats.total) * 100) : 0
  const offerRate = stats.total > 0 ? Math.round((stats.offers / stats.total) * 100) : 0
  const avgScore = allApps.length > 0 ? Math.round(allApps.reduce((s, a) => s + (a.match_score || 0), 0) / allApps.length) : 0

  // Funnel data
  const statusOrder = ['applied', 'reviewed', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn']
  const funnelStages = [
    { key: 'applied', label: 'Applied', color: 'bg-slate-500', light: 'bg-slate-100 text-slate-700' },
    { key: 'reviewed', label: 'Reviewed', color: 'bg-blue-500', light: 'bg-blue-100 text-blue-700' },
    { key: 'shortlisted', label: 'Shortlisted', color: 'bg-purple-500', light: 'bg-purple-100 text-purple-700' },
    { key: 'interview', label: 'Interview', color: 'bg-amber-500', light: 'bg-amber-100 text-amber-700' },
    { key: 'offered', label: 'Offered', color: 'bg-emerald-500', light: 'bg-emerald-100 text-emerald-700' },
  ].map(s => {
    const idx = statusOrder.indexOf(s.key)
    return { ...s, count: allApps.filter(a => { if (s.key === 'applied') return true; return statusOrder.indexOf(a.status) >= idx }).length }
  })
  const funnelMax = Math.max(funnelStages[0]?.count || 1, 1)

  // Heatmap helpers
  const heatMax = Math.max(...skillDemand.map(s => s.count), 1)
  function heatColor(count) {
    const i = count / heatMax
    return i >= 0.8 ? 'bg-red-500 text-white' : i >= 0.6 ? 'bg-orange-400 text-white' : i >= 0.4 ? 'bg-amber-400 text-white' : i >= 0.2 ? 'bg-yellow-300 text-yellow-900' : 'bg-yellow-100 text-yellow-800'
  }

  // Weekly chart
  const weekMax = Math.max(...weeklyData.flatMap(w => [w.applied, w.interviews, w.offers]), 1)
  const wowChange = weeklyData.length >= 2 ? (() => {
    const c = weeklyData[weeklyData.length - 1], p = weeklyData[weeklyData.length - 2]
    const ct = c.applied + c.interviews + c.offers, pt = p.applied + p.interviews + p.offers
    return pt > 0 ? Math.round(((ct - pt) / pt) * 100) : ct > 0 ? 100 : 0
  })() : 0

  return (
    <div className="space-y-5">

      {/* ── Row 1: Placement Prediction (compact) ── */}
      <div className="card bg-gradient-to-r from-primary to-primary-light text-white !border-0 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold font-mono">{prediction}%</span>
            </div>
            <div>
              <p className="text-white/50 text-xs font-medium">Placement Probability</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-24 bg-white/20 rounded-full h-1.5">
                  <div className={`rounded-full h-1.5 ${prediction >= 70 ? 'bg-emerald-400' : prediction >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${prediction}%` }} />
                </div>
                <span className="text-white/60 text-xs">{prediction >= 80 ? 'Excellent' : prediction >= 60 ? 'Good' : prediction >= 40 ? 'Average' : 'Needs work'}</span>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-white/40">
            <span>Skills: <span className="text-white font-medium">{verifiedCount}/{totalSkills || 0}</span></span>
            <span>Interview: <span className="text-white font-medium">{bestScore || 0}/100</span></span>
            <span>Apps: <span className="text-white font-medium">{stats.total}</span></span>
          </div>
        </div>
      </div>

      {/* ── Row 2: 4 Insight Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Applications', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Response Rate', value: `${responseRate}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Offer Rate', value: `${offerRate}%`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg Match', value: `${avgScore}%`, color: 'text-accent', bg: 'bg-accent/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-xs text-primary/40">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Row 3: Funnel + Weekly Progress (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Application Funnel */}
        <div className="card">
          <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-accent" /> Application Funnel</h3>
          {stats.total === 0 ? (
            <p className="text-primary/40 text-xs text-center py-4">No applications yet. <Link to="/jobs" className="text-accent">Browse jobs</Link></p>
          ) : (
            <div className="space-y-2">
              {funnelStages.map((s, i) => {
                const pct = Math.round((s.count / funnelMax) * 100)
                const conv = i > 0 && funnelStages[i-1].count > 0 ? Math.round((s.count / funnelStages[i-1].count) * 100) : null
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`badge text-xs py-0.5 ${s.light}`}>{s.label}</span>
                        {conv !== null && <span className="text-xs text-primary/25">{conv}%</span>}
                      </div>
                      <span className="text-xs font-bold font-mono text-primary">{s.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(pct, s.count > 0 ? 8 : 0)}%` }} transition={{ duration: 0.7, delay: i * 0.1 }}
                        className={`h-full rounded-full ${s.color} flex items-center justify-end pr-1.5`}>
                        {pct > 20 && <span className="text-xs font-bold text-white">{pct}%</span>}
                      </motion.div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Weekly Progress */}
        <div className="card">
          <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Weekly Progress</h3>
          <div className="flex items-end gap-3 h-32">
            {weeklyData.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex items-end justify-center gap-0.5 h-24">
                  {[
                    { val: w.applied, color: 'bg-blue-400', label: `${w.applied} applied` },
                    { val: w.interviews, color: 'bg-amber-400', label: `${w.interviews} interviews` },
                    { val: w.offers, color: 'bg-emerald-400', label: `${w.offers} offers` },
                  ].map((b, bi) => (
                    <motion.div key={bi} initial={{ height: 0 }} animate={{ height: `${Math.max((b.val / weekMax) * 100, b.val > 0 ? 10 : 0)}%` }}
                      transition={{ duration: 0.5, delay: i * 0.08 + bi * 0.05 }}
                      className={`w-4 ${b.color} rounded-t relative group cursor-default`}>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                        <div className="bg-primary text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap">{b.label}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <span className="text-xs text-primary/30">{w.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-3">
              <span className="flex items-center gap-1 text-xs text-primary/40"><span className="w-2.5 h-2.5 rounded bg-blue-400" />Applied</span>
              <span className="flex items-center gap-1 text-xs text-primary/40"><span className="w-2.5 h-2.5 rounded bg-amber-400" />Interview</span>
              <span className="flex items-center gap-1 text-xs text-primary/40"><span className="w-2.5 h-2.5 rounded bg-emerald-400" />Offer</span>
            </div>
            <span className={`text-xs font-medium flex items-center gap-0.5 ${wowChange > 0 ? 'text-emerald-600' : wowChange < 0 ? 'text-red-500' : 'text-primary/30'}`}>
              {wowChange > 0 ? <ChevronUp className="w-3 h-3" /> : wowChange < 0 ? <ChevronDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {wowChange > 0 ? `+${wowChange}%` : wowChange < 0 ? `${wowChange}%` : '—'} WoW
            </span>
          </div>
        </div>
      </div>

      {/* ── Row 4: Skill Demand Heatmap (compact) ── */}
      {skillDemand.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> Skill Demand</h3>
          <div className="flex flex-wrap gap-1.5">
            {skillDemand.slice(0, 15).map(({ skill, count, hasSkill }) => (
              <span key={skill} className={`relative inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${heatColor(count)}`}>
                {skill} <span className="opacity-60">({count})</span>
                {hasSkill && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Row 5: Recent Apps + Mock Interviews (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold">Recent Applications</h3>
            <Link to="/applications" className="text-xs text-accent font-medium">View All</Link>
          </div>
          {allApps.length === 0 ? (
            <p className="text-primary/40 text-xs text-center py-6">No applications yet. <Link to="/jobs" className="text-accent">Browse jobs</Link></p>
          ) : (
            <div className="space-y-2">{allApps.slice(0, 4).map(app => <ApplicationCard key={app.id} application={app} />)}</div>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              Mock Interviews
              {bestScore != null && <span className="badge bg-accent/10 text-accent text-xs py-0.5">Best: {bestScore}</span>}
            </h3>
            <Link to="/interview" className="text-xs text-accent font-medium">Practice</Link>
          </div>
          {mockInterviews.length === 0 ? (
            <p className="text-primary/40 text-xs text-center py-6">No interviews yet. <Link to="/interview" className="text-accent">Practice now</Link></p>
          ) : (
            <div className="space-y-2">
              {mockInterviews.slice(0, 4).map(s => (
                <Link key={s.id} to={`/interview/result/${s.id}`} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-primary/5 hover:border-accent/30 transition-all">
                  <div className="min-w-0">
                    <p className="font-medium text-primary text-sm truncate">{s.job_title}</p>
                    <p className="text-xs text-primary/40">{s.company_name} · {new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`text-base font-bold font-mono ${(s.overall_score || 0) >= 70 ? 'text-emerald-600' : (s.overall_score || 0) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.overall_score || 0}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary/20" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 6: Rankings (if data) ── */}
      {rankings.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-purple-500" /> Your Ranking vs Applicants</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rankings.map(r => (
              <Link key={r.jobId} to={`/jobs/${r.jobId}`} className="border border-primary/5 rounded-xl p-3 hover:border-accent/20 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-primary truncate flex-1 mr-2">{r.jobTitle}</p>
                  <span className={`text-lg font-bold font-mono ${r.percentile >= 75 ? 'text-emerald-600' : r.percentile >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>#{r.rank}</span>
                </div>
                <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{ left: '0%' }} animate={{ left: `${Math.max(4, Math.min(96, r.percentile))}%` }} transition={{ duration: 0.8 }}
                    className="absolute w-4 h-4 rounded-full bg-accent shadow-sm flex items-center justify-center -translate-x-1/2 z-10">
                    <span className="text-[6px] font-bold text-white">You</span>
                  </motion.div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-primary/25">{r.totalApplicants} applicants</span>
                  <span className={`text-xs font-medium ${r.percentile >= 75 ? 'text-emerald-600' : r.percentile >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>Top {100 - r.percentile}%</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Row 7: QR Profile + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card bg-gradient-to-r from-accent/5 via-purple-50 to-accent/5 border-accent/15">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white rounded-xl border border-primary/10 p-1.5 shadow-sm flex-shrink-0">
              <QRCodeCanvas value={`${window.location.origin}/u/${user.uid}`} size={72} bgColor="#ffffff" fgColor="#0f172a" level="M" includeMargin={false} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-bold text-sm text-primary flex items-center gap-2 justify-center sm:justify-start"><Share2 className="w-3.5 h-3.5 text-accent" /> Verified Digital Profile</h3>
              <p className="text-xs text-primary/40 mt-0.5">Share your proven skills with recruiters via QR code.</p>
              <div className="flex gap-2 mt-2 justify-center sm:justify-start">
                <Link to={`/u/${user.uid}`} className="btn-accent text-xs py-1.5 px-3"><Eye className="w-3 h-3" /> View</Link>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/u/${user.uid}`); toast.success('Link copied!') }} className="btn-secondary text-xs py-1.5 px-3"><Copy className="w-3 h-3" /> Copy</button>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
          <Link to="/jobs" className="card text-center hover:border-accent group py-3"><Briefcase className="w-5 h-5 text-accent mx-auto mb-1" /><p className="text-xs font-medium group-hover:text-accent">Jobs</p></Link>
          <Link to="/resume-match" className="card text-center hover:border-accent group py-3"><Star className="w-5 h-5 text-accent mx-auto mb-1" /><p className="text-xs font-medium group-hover:text-accent">AI Match</p></Link>
          <Link to="/interview" className="card text-center hover:border-accent group py-3"><MessageSquare className="w-5 h-5 text-accent mx-auto mb-1" /><p className="text-xs font-medium group-hover:text-accent">Interview</p></Link>
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Board Constants ───
const KANBAN_COLUMNS = [
  { key: 'applied', label: 'Applied', color: 'bg-blue-500', lightBg: 'bg-blue-50', lightText: 'text-blue-700', borderColor: 'border-blue-200', dropBg: 'bg-blue-100' },
  { key: 'reviewed', label: 'Reviewed', color: 'bg-yellow-500', lightBg: 'bg-yellow-50', lightText: 'text-yellow-700', borderColor: 'border-yellow-200', dropBg: 'bg-yellow-100' },
  { key: 'shortlisted', label: 'Shortlisted', color: 'bg-purple-500', lightBg: 'bg-purple-50', lightText: 'text-purple-700', borderColor: 'border-purple-200', dropBg: 'bg-purple-100' },
  { key: 'interview', label: 'Interview', color: 'bg-orange-500', lightBg: 'bg-orange-50', lightText: 'text-orange-700', borderColor: 'border-orange-200', dropBg: 'bg-orange-100' },
  { key: 'offered', label: 'Offered', color: 'bg-emerald-500', lightBg: 'bg-emerald-50', lightText: 'text-emerald-700', borderColor: 'border-emerald-200', dropBg: 'bg-emerald-100' },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-500', lightBg: 'bg-red-50', lightText: 'text-red-600', borderColor: 'border-red-200', dropBg: 'bg-red-100' },
]

// ─── Kanban Card ───
function KanbanCard({ app, onDragStart, onExpand, expanded }) {
  const score = app.match_score ? Math.round(app.match_score) : null
  const scoreColor = score >= 75 ? 'bg-emerald-100 text-emerald-700' : score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, app.id)}
      className="bg-white rounded-xl border border-primary/10 p-3 shadow-sm hover:shadow-md hover:border-accent/30 transition-all cursor-grab active:cursor-grabbing active:shadow-lg active:scale-[1.02] group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <GripVertical className="w-3.5 h-3.5 text-primary/20 group-hover:text-primary/40 flex-shrink-0" />
            <h4 className="font-semibold text-sm text-primary truncate">{app.profiles?.full_name || 'Unknown'}</h4>
          </div>
          <p className="text-xs text-primary/40 mt-0.5 truncate ml-5.5">{app.profiles?.email}</p>
        </div>
        {score != null && (
          <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-full flex-shrink-0 ${scoreColor}`}>{score}%</span>
        )}
      </div>

      {/* Skills preview */}
      {app.profiles?.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 ml-5.5">
          {app.profiles.skills.slice(0, 3).map(s => {
            const verified = app.profiles.skills_verified?.includes(s)
            return (
              <span key={s} className={`text-xs px-1.5 py-0.5 rounded ${verified ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                {verified && '✓ '}{s}
              </span>
            )
          })}
          {app.profiles.skills.length > 3 && <span className="text-xs text-primary/30">+{app.profiles.skills.length - 3}</span>}
        </div>
      )}

      {/* Verified badge */}
      {app.profiles?.skills_verified?.length > 0 && (
        <div className="mt-1.5 ml-5.5">
          <span className="text-xs text-emerald-600 font-medium">{app.profiles.skills_verified.length} verified</span>
        </div>
      )}

      {/* Expand for details */}
      <button
        onClick={(e) => { e.stopPropagation(); onExpand(app.id) }}
        className="mt-2 ml-5.5 text-xs text-primary/30 hover:text-accent flex items-center gap-0.5"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Less' : 'Details'}
      </button>

      {expanded && (
        <div className="mt-2 ml-5.5 space-y-1.5 border-t border-primary/5 pt-2">
          {app.profiles?.candidate_year != null && (
            <p className="text-xs text-primary/50">{app.profiles.candidate_year}{['st','nd','rd','th'][Math.min(app.profiles.candidate_year - 1, 3)]} Year Student</p>
          )}
          {app.profiles?.education && (
            <p className="text-xs text-primary/50">{app.profiles.education}</p>
          )}
          {app.profiles?.resume_url && (
            <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/resumes/${app.profiles.resume_url}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-accent hover:underline block">
              View Resume
            </a>
          )}
          {app.match_reasoning && <p className="text-xs text-accent/80 italic">{app.match_reasoning}</p>}
          {app.cover_letter && (
            <div className="bg-slate-50 rounded-lg p-2 mt-1">
              <p className="text-xs text-primary/40 font-medium mb-0.5">Cover Letter</p>
              <p className="text-xs text-primary/60 line-clamp-3">{app.cover_letter}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Kanban Column ───
function KanbanColumn({ column, apps, onDragStart, onDragOver, onDrop, dragOverCol, expandedApp, onExpand }) {
  const isOver = dragOverCol === column.key

  return (
    <div
      className="flex-1 min-w-[200px]"
      onDragOver={(e) => onDragOver(e, column.key)}
      onDrop={(e) => onDrop(e, column.key)}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${column.lightBg}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
          <span className={`text-sm font-semibold ${column.lightText}`}>{column.label}</span>
        </div>
        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${column.lightBg} ${column.lightText} border ${column.borderColor}`}>
          {apps.length}
        </span>
      </div>

      {/* Drop zone */}
      <div className={`min-h-[200px] max-h-[60vh] overflow-y-auto rounded-b-xl border-2 border-dashed p-2 space-y-2 transition-all duration-200 ${
        isOver ? `${column.dropBg} ${column.borderColor} scale-[1.01]` : 'border-primary/10 bg-slate-50/50'
      }`}>
        {apps.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-primary/25">
            Drop here
          </div>
        )}
        {apps.map(app => (
          <KanbanCard key={app.id} app={app} onDragStart={onDragStart} onExpand={onExpand} expanded={expandedApp === app.id} />
        ))}
      </div>
    </div>
  )
}

function RecruiterDashboard({ user }) {
  const [jobs, setJobs] = useState([])
  const [stats, setStats] = useState({ active: 0, totalApps: 0, shortlisted: 0 })
  const [selectedJob, setSelectedJob] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [ranking, setRanking] = useState(false)
  const [expandedApp, setExpandedApp] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [draggingId, setDraggingId] = useState(null)

  useEffect(() => { loadJobs() }, [user.uid])

  async function loadJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('recruiter_id', user.uid)
      .order('created_at', { ascending: false })

    const allJobs = data || []
    setJobs(allJobs)

    const jobIds = allJobs.map((j) => j.id)
    let appCount = 0
    let shortCount = 0
    if (jobIds.length) {
      const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('job_id', jobIds)
      appCount = count || 0

      const { count: sc } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('job_id', jobIds)
        .eq('status', 'shortlisted')
      shortCount = sc || 0
    }

    setStats({ active: allJobs.filter((j) => j.is_active).length, totalApps: appCount, shortlisted: shortCount })
    setLoading(false)
  }

  async function viewApplications(job) {
    setSelectedJob(job)
    setExpandedApp(null)
    const { data } = await supabase
      .from('applications')
      .select('*, profiles(full_name, email, skills, resume_url, candidate_year, education, skills_verified, quiz_scores)')
      .eq('job_id', job.id)
      .order('match_score', { ascending: false, nullsFirst: false })
    setApplications(data || [])
  }

  async function updateApplicationStatus(appId, newStatus) {
    const { error } = await supabase.from('applications').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', appId)
    if (error) { toast.error(error.message); return }
    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a))
    toast.success(`Moved to ${newStatus}`)

    const app = applications.find(a => a.id === appId)

    // Generate AI rejection feedback
    if (newStatus === 'rejected' && app && selectedJob) {
      const shortlisted = applications.filter(a => ['shortlisted', 'interview', 'offered'].includes(a.status))
      const avgShortlistedScore = shortlisted.length > 0 ? Math.round(shortlisted.reduce((s, a) => s + (a.match_score || 0), 0) / shortlisted.length) : null
      const shortlistedSkills = [...new Set(shortlisted.flatMap(a => a.profiles?.skills_verified || []))]

      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile', temperature: 0.4, max_tokens: 300,
            messages: [{ role: 'user', content: `Generate constructive rejection feedback for a job application.

Job: ${selectedJob.title} at ${selectedJob.company_name}
Required skills: ${(selectedJob.skills_required || []).join(', ')}

Rejected candidate:
- Match score: ${app.match_score ? Math.round(app.match_score) + '%' : 'N/A'}
- Skills: ${(app.profiles?.skills || []).join(', ')}
- Verified skills: ${(app.profiles?.skills_verified || []).join(', ') || 'None'}

${avgShortlistedScore ? `Shortlisted candidates averaged: ${avgShortlistedScore}% match score` : ''}
${shortlistedSkills.length ? `Skills that shortlisted candidates had: ${shortlistedSkills.join(', ')}` : ''}

Write 2-3 sentences of constructive feedback. Be encouraging. Tell them specifically what skills to improve and what to do next. Do NOT be harsh. Return ONLY the feedback text.` }],
          }),
        })
        const data = await res.json()
        const feedback = data.choices?.[0]?.message?.content?.trim()
        if (feedback) {
          await supabase.from('applications').update({ recruiter_notes: feedback }).eq('id', appId)
        }
      } catch {}
    }

    // Send email notification
    if (app?.profiles?.email && selectedJob) {
      const sent = await sendStatusEmail({
        candidateEmail: app.profiles.email,
        candidateName: app.profiles.full_name || 'Candidate',
        jobTitle: selectedJob.title,
        companyName: selectedJob.company_name,
        newStatus,
      })
      if (sent) toast.success('Email sent to candidate')
    }
  }

  async function toggleJobActive(jobId, isActive) {
    await supabase.from('jobs').update({ is_active: !isActive }).eq('id', jobId)
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, is_active: !isActive } : j))
    toast.success(isActive ? 'Job deactivated' : 'Job activated')
  }

  async function deleteJob(jobId) {
    if (!confirm('Delete this job and all its applications?')) return
    await supabase.from('jobs').delete().eq('id', jobId)
    setJobs((prev) => prev.filter((j) => j.id !== jobId))
    if (selectedJob?.id === jobId) { setSelectedJob(null); setApplications([]) }
    toast.success('Job deleted')
  }

  async function rankCandidates() {
    if (!selectedJob || applications.length === 0) return
    setRanking(true)
    try {
      const rankings = await aiRankCandidates(selectedJob, applications.map((a) => ({
        candidate_id: a.candidate_id,
        name: a.profiles?.full_name,
        skills: a.profiles?.skills,
        candidate_year: a.profiles?.candidate_year,
        education: a.profiles?.education,
        match_score: a.match_score,
      })))

      for (const r of rankings) {
        await supabase.from('applications').update({ match_score: r.score, match_reasoning: r.recommendation }).eq('job_id', selectedJob.id).eq('candidate_id', r.candidate_id)
      }
      viewApplications(selectedJob)
      toast.success('Candidates ranked by AI!')
    } catch (err) {
      toast.error(err.message || 'Ranking failed')
    } finally {
      setRanking(false)
    }
  }

  // ─── Drag & Drop Handlers ───
  function handleDragStart(e, appId) {
    setDraggingId(appId)
    e.dataTransfer.setData('text/plain', appId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, columnKey) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(columnKey)
  }

  function handleDrop(e, newStatus) {
    e.preventDefault()
    setDragOverCol(null)
    const appId = e.dataTransfer.getData('text/plain')
    const app = applications.find(a => a.id === appId)
    if (!app || app.status === newStatus) { setDraggingId(null); return }
    setDraggingId(null)
    updateApplicationStatus(appId, newStatus)
  }

  if (loading) return <LoadingSpinner className="py-20" size="lg" />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Active Listings" value={stats.active} icon={Briefcase} color="accent" />
        <StatsCard title="Total Applications" value={stats.totalApps} icon={FileText} color="blue" />
        <StatsCard title="Shortlisted" value={stats.shortlisted} icon={Star} color="purple" />
      </div>

      {/* Job Listings — horizontal scroll on mobile */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold">My Job Listings</h3>
          <Link to="/post-job" className="btn-accent text-sm py-2 px-4">+ Post New Job</Link>
        </div>
        {jobs.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-slate-500">No jobs posted yet.</p>
            <Link to="/post-job" className="btn-accent mt-3 text-sm inline-block">Post Your First Job</Link>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {jobs.map((job) => (
              <div key={job.id} className={`card cursor-pointer transition-all duration-300 flex-shrink-0 w-72 ${selectedJob?.id === job.id ? 'ring-2 ring-accent shadow-md' : 'hover:shadow-md'}`} onClick={() => viewApplications(job)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{job.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>{job.location}</span>
                      <span className="capitalize">{job.job_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); toggleJobActive(job.id, job.is_active) }}
                      className={`badge cursor-pointer text-xs ${job.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {job.is_active ? 'Active' : 'Off'}
                    </button>
                    <Link to={`/edit-job/${job.id}`} onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-accent"><Edit3 className="w-3.5 h-3.5" /></Link>
                    <Link to={`/jobs/${job.id}`} onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-accent"><Eye className="w-3.5 h-3.5" /></Link>
                    <button onClick={(e) => { e.stopPropagation(); deleteJob(job.id) }} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-xs text-primary/40 mt-2">{job.application_count || 0} applicants</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      {selectedJob && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <LayoutGrid className="w-5 h-5 text-accent" />
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  Hiring Pipeline
                </h3>
                <p className="text-xs text-primary/40">{selectedJob.title} — drag candidates between stages</p>
              </div>
            </div>
            <button onClick={rankCandidates} disabled={ranking || applications.length === 0} className="btn-secondary text-sm py-2 px-3 disabled:opacity-50">
              {ranking ? 'Ranking...' : '✨ AI Rank'}
            </button>
          </div>

          {applications.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No applications yet for this job.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 pb-4" onDragLeave={() => setDragOverCol(null)}>
              <div className="flex gap-3 min-w-[900px]">
                {KANBAN_COLUMNS.map(col => (
                  <KanbanColumn
                    key={col.key}
                    column={col}
                    apps={applications.filter(a => a.status === col.key)}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    dragOverCol={dragOverCol}
                    expandedApp={expandedApp}
                    onExpand={(id) => setExpandedApp(expandedApp === id ? null : id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedJob && jobs.length > 0 && (
        <div className="card text-center py-12 border-2 border-dashed border-primary/10">
          <LayoutGrid className="w-10 h-10 text-primary/20 mx-auto mb-3" />
          <p className="text-primary/40 font-medium">Select a job above to open the Kanban pipeline</p>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingSpinner className="min-h-screen" size="lg" />

  // TPO redirects to their own dashboard
  if (profile?.role === 'tpo') {
    return <Navigate to="/tpo" replace />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Welcome, {profile?.full_name || 'there'}!
          </h1>
          {profile?.role === 'recruiter' && profile?.verification_status === 'verified' && (
            <span className="badge bg-emerald-100 text-emerald-700 text-xs">Verified</span>
          )}
          {profile?.role === 'recruiter' && profile?.verification_status === 'pending' && (
            <span className="badge bg-amber-100 text-amber-700 text-xs">Pending Verification</span>
          )}
          {profile?.role === 'recruiter' && profile?.verification_status === 'rejected' && (
            <span className="badge bg-red-100 text-red-700 text-xs">Verification Rejected</span>
          )}
        </div>
        <p className="text-slate-500 capitalize text-sm">{profile?.role} Dashboard</p>
      </div>
      {profile?.role === 'recruiter' ? <RecruiterDashboard user={user} profile={profile} /> : <CandidateDashboard user={user} profile={profile} />}
    </div>
  )
}
