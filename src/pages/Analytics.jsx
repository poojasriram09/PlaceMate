import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { BarChart3, TrendingUp, Target, Users, ArrowRight, ArrowLeft, Flame, Award, Zap, ChevronUp, ChevronDown, Minus } from 'lucide-react'

// ─── Application Funnel ───
function ApplicationFunnel({ apps }) {
  const stages = [
    { key: 'applied', label: 'Applied', color: 'bg-slate-500', light: 'bg-slate-100 text-slate-700' },
    { key: 'reviewed', label: 'Reviewed', color: 'bg-blue-500', light: 'bg-blue-100 text-blue-700' },
    { key: 'shortlisted', label: 'Shortlisted', color: 'bg-purple-500', light: 'bg-purple-100 text-purple-700' },
    { key: 'interview', label: 'Interview', color: 'bg-amber-500', light: 'bg-amber-100 text-amber-700' },
    { key: 'offered', label: 'Offered', color: 'bg-emerald-500', light: 'bg-emerald-100 text-emerald-700' },
  ]

  const statusOrder = ['applied', 'reviewed', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn']

  // Count apps at each stage or beyond (funnel = cumulative)
  const counts = stages.map(s => {
    const idx = statusOrder.indexOf(s.key)
    return {
      ...s,
      count: apps.filter(a => {
        const appIdx = statusOrder.indexOf(a.status)
        // For funnel: count if app reached this stage or went further (but not rejected/withdrawn)
        if (s.key === 'applied') return true // all apps were applied
        if (['rejected', 'withdrawn'].includes(a.status)) {
          // For rejected/withdrawn, they may have reached this stage before being rejected
          // We approximate: rejected after review = reached reviewed, etc.
          return appIdx >= idx || (a.status === 'rejected' && appIdx >= idx)
        }
        return appIdx >= idx
      }).length
    }
  })

  const max = Math.max(counts[0]?.count || 1, 1)

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
        <Target className="w-5 h-5 text-accent" /> Application Funnel
      </h3>
      <p className="text-xs text-primary/40 mb-5">Your journey from applied to offered</p>

      <div className="space-y-3">
        {counts.map((stage, i) => {
          const pct = max > 0 ? Math.round((stage.count / max) * 100) : 0
          const conversionFromPrev = i > 0 && counts[i - 1].count > 0
            ? Math.round((stage.count / counts[i - 1].count) * 100)
            : null

          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`badge text-xs font-medium ${stage.light}`}>{stage.label}</span>
                  {conversionFromPrev !== null && (
                    <span className="text-xs text-primary/30">{conversionFromPrev}% conversion</span>
                  )}
                </div>
                <span className="text-sm font-bold font-mono text-primary">{stage.count}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-7 overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, stage.count > 0 ? 8 : 0)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.15, ease: 'easeOut' }}
                  className={`h-full rounded-full ${stage.color} flex items-center justify-end pr-2`}
                >
                  {pct > 15 && <span className="text-xs font-bold text-white">{pct}%</span>}
                </motion.div>
              </div>
              {i < counts.length - 1 && (
                <div className="flex justify-center my-1">
                  <div className="w-px h-3 bg-primary/10" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {apps.length === 0 && (
        <div className="text-center py-6">
          <p className="text-primary/40 text-sm">No applications yet.</p>
          <Link to="/jobs" className="text-accent text-sm font-medium hover:underline">Browse jobs to get started</Link>
        </div>
      )}
    </div>
  )
}

// ─── Skill Demand Heatmap ───
function SkillDemandHeatmap({ skillDemand }) {
  if (!skillDemand.length) return null

  const maxCount = Math.max(...skillDemand.map(s => s.count), 1)

  function heatColor(count) {
    const intensity = count / maxCount
    if (intensity >= 0.8) return 'bg-red-500 text-white'
    if (intensity >= 0.6) return 'bg-orange-400 text-white'
    if (intensity >= 0.4) return 'bg-amber-400 text-white'
    if (intensity >= 0.2) return 'bg-yellow-300 text-yellow-900'
    return 'bg-yellow-100 text-yellow-800'
  }

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
        <Flame className="w-5 h-5 text-orange-500" /> Skill Demand Heatmap
      </h3>
      <p className="text-xs text-primary/40 mb-4">Most requested skills across active jobs</p>

      <div className="flex flex-wrap gap-2">
        {skillDemand.slice(0, 20).map(({ skill, count, hasSkill }) => (
          <div key={skill} className="relative group">
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-transform hover:scale-105 cursor-default ${heatColor(count)}`}>
              {skill}
              <span className="text-xs opacity-75">({count})</span>
            </span>
            {hasSkill && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </span>
            )}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-primary text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                {count} job{count > 1 ? 's' : ''} require this
                {hasSkill ? ' — You have it!' : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4 text-xs text-primary/40">
        <span>Demand:</span>
        <div className="flex items-center gap-1">
          <span className="w-5 h-3 rounded bg-yellow-100" /> Low
          <span className="w-5 h-3 rounded bg-amber-400 ml-2" /> Medium
          <span className="w-5 h-3 rounded bg-red-500 ml-2" /> High
        </div>
        <span className="ml-2">
          <span className="inline-flex w-3 h-3 bg-emerald-500 rounded-full mr-0.5 align-middle" /> = You have it
        </span>
      </div>
    </div>
  )
}

// ─── Applicant Ranking ───
function ApplicantRanking({ rankings }) {
  if (!rankings.length) return null

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
        <Award className="w-5 h-5 text-purple-500" /> Your Ranking vs Other Applicants
      </h3>
      <p className="text-xs text-primary/40 mb-4">How you compare on jobs you've applied to</p>

      <div className="space-y-4">
        {rankings.slice(0, 5).map((r) => (
          <div key={r.jobId} className="border border-primary/5 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0 flex-1">
                <Link to={`/jobs/${r.jobId}`} className="text-sm font-semibold text-primary hover:text-accent transition-colors line-clamp-1">
                  {r.jobTitle}
                </Link>
                <p className="text-xs text-primary/40">{r.company} — {r.totalApplicants} applicant{r.totalApplicants > 1 ? 's' : ''}</p>
              </div>
              <div className="text-right ml-3 flex-shrink-0">
                <div className={`text-2xl font-bold font-mono ${r.percentile >= 75 ? 'text-emerald-600' : r.percentile >= 50 ? 'text-blue-600' : r.percentile >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                  #{r.rank}
                </div>
                <p className="text-xs text-primary/40">of {r.totalApplicants}</p>
              </div>
            </div>

            {/* Visual position bar */}
            <div className="relative w-full h-6 bg-slate-100 rounded-full overflow-hidden">
              <div className="absolute inset-0 flex items-center">
                {/* Other applicants as dots */}
                {Array.from({ length: Math.min(r.totalApplicants, 20) }).map((_, i) => {
                  const pos = r.totalApplicants > 1 ? (i / (Math.min(r.totalApplicants, 20) - 1)) * 100 : 50
                  return (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-primary/15"
                      style={{ left: `${Math.max(4, Math.min(96, pos))}%` }}
                    />
                  )
                })}
                {/* You */}
                <motion.div
                  initial={{ left: '0%' }}
                  animate={{ left: `${Math.max(4, Math.min(96, r.percentile))}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="absolute w-5 h-5 rounded-full bg-accent shadow-md flex items-center justify-center z-10 -translate-x-1/2"
                >
                  <span className="text-[8px] font-bold text-white">You</span>
                </motion.div>
              </div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-primary/30">Lower match</span>
              <span className={`text-xs font-medium ${r.percentile >= 75 ? 'text-emerald-600' : r.percentile >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>
                Top {100 - r.percentile}%
              </span>
              <span className="text-[10px] text-primary/30">Higher match</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Weekly Progress Chart ───
function WeeklyProgress({ weeklyData }) {
  const maxVal = Math.max(...weeklyData.flatMap(w => [w.applied, w.interviews, w.offers]), 1)

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-primary mb-1 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-emerald-500" /> Weekly Progress
      </h3>
      <p className="text-xs text-primary/40 mb-5">Your application activity over the last 4 weeks</p>

      <div className="flex items-end gap-3 h-44">
        {weeklyData.map((week, i) => {
          const appliedH = (week.applied / maxVal) * 100
          const interviewH = (week.interviews / maxVal) * 100
          const offerH = (week.offers / maxVal) * 100

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center gap-1 h-32">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(appliedH, week.applied > 0 ? 8 : 0)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="w-5 bg-blue-400 rounded-t-md relative group cursor-default"
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                    <div className="bg-primary text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap">{week.applied} applied</div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(interviewH, week.interviews > 0 ? 8 : 0)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 + 0.1 }}
                  className="w-5 bg-amber-400 rounded-t-md relative group cursor-default"
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                    <div className="bg-primary text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap">{week.interviews} interviews</div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(offerH, week.offers > 0 ? 8 : 0)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 + 0.2 }}
                  className="w-5 bg-emerald-400 rounded-t-md relative group cursor-default"
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                    <div className="bg-primary text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap">{week.offers} offers</div>
                  </div>
                </motion.div>
              </div>
              <span className="text-xs text-primary/40 mt-1">{week.label}</span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-4">
        <span className="flex items-center gap-1.5 text-xs text-primary/50"><span className="w-3 h-3 rounded bg-blue-400" /> Applied</span>
        <span className="flex items-center gap-1.5 text-xs text-primary/50"><span className="w-3 h-3 rounded bg-amber-400" /> Interviews</span>
        <span className="flex items-center gap-1.5 text-xs text-primary/50"><span className="w-3 h-3 rounded bg-emerald-400" /> Offers</span>
      </div>

      {/* WoW change */}
      {weeklyData.length >= 2 && (() => {
        const curr = weeklyData[weeklyData.length - 1]
        const prev = weeklyData[weeklyData.length - 2]
        const currTotal = curr.applied + curr.interviews + curr.offers
        const prevTotal = prev.applied + prev.interviews + prev.offers
        const change = prevTotal > 0 ? Math.round(((currTotal - prevTotal) / prevTotal) * 100) : currTotal > 0 ? 100 : 0

        return (
          <div className={`mt-4 flex items-center justify-center gap-2 text-sm font-medium ${change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-primary/40'}`}>
            {change > 0 ? <ChevronUp className="w-4 h-4" /> : change < 0 ? <ChevronDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            {change > 0 ? `+${change}%` : change < 0 ? `${change}%` : 'No change'} vs last week
          </div>
        )
      })()}
    </div>
  )
}

// ─── Summary Stats Row ───
function SummaryStats({ apps, profile }) {
  const totalApps = apps.length
  const responseRate = totalApps > 0 ? Math.round((apps.filter(a => a.status !== 'applied').length / totalApps) * 100) : 0
  const offerRate = totalApps > 0 ? Math.round((apps.filter(a => a.status === 'offered').length / totalApps) * 100) : 0
  const avgScore = apps.length > 0 ? Math.round(apps.reduce((s, a) => s + (a.match_score || 0), 0) / apps.length) : 0

  const stats = [
    { label: 'Total Applications', value: totalApps, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Response Rate', value: `${responseRate}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Offer Rate', value: `${offerRate}%`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg Match Score', value: `${avgScore}%`, color: 'text-accent', bg: 'bg-accent/10' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`${s.bg} rounded-xl p-4 text-center`}
        >
          <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
          <p className="text-xs text-primary/50 mt-1">{s.label}</p>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Main Page ───
export default function Analytics() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [apps, setApps] = useState([])
  const [skillDemand, setSkillDemand] = useState([])
  const [rankings, setRankings] = useState([])
  const [weeklyData, setWeeklyData] = useState([])

  useEffect(() => {
    if (!user) return
    loadAnalytics()
  }, [user])

  async function loadAnalytics() {
    // 1. Fetch all applications with job data
    const { data: applications } = await supabase
      .from('applications')
      .select('*, jobs(id, title, company_name, skills_required)')
      .eq('candidate_id', user.uid)
      .order('created_at', { ascending: false })

    const allApps = applications || []
    setApps(allApps)

    // 2. Skill demand heatmap — aggregate skills from all active jobs
    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('skills_required')
      .eq('is_active', true)

    const skillCount = {}
    for (const job of (activeJobs || [])) {
      for (const skill of (job.skills_required || [])) {
        const s = skill.trim()
        if (!s) continue
        skillCount[s] = (skillCount[s] || 0) + 1
      }
    }

    const mySkills = (profile?.skills || []).map(s => s.toLowerCase())
    const demandArr = Object.entries(skillCount)
      .map(([skill, count]) => ({
        skill,
        count,
        hasSkill: mySkills.some(ms => ms.includes(skill.toLowerCase()) || skill.toLowerCase().includes(ms)),
      }))
      .sort((a, b) => b.count - a.count)
    setSkillDemand(demandArr)

    // 3. Ranking — for each applied job, get all applicants and find candidate's position
    const jobIds = [...new Set(allApps.map(a => a.jobs?.id).filter(Boolean))]
    const rankingData = []

    for (const jobId of jobIds.slice(0, 5)) {
      const app = allApps.find(a => a.jobs?.id === jobId)
      if (!app) continue

      const { data: jobApps } = await supabase
        .from('applications')
        .select('candidate_id, match_score')
        .eq('job_id', jobId)
        .order('match_score', { ascending: false, nullsFirst: false })

      if (!jobApps?.length) continue

      const myIndex = jobApps.findIndex(a => a.candidate_id === user.uid)
      if (myIndex === -1) continue

      const rank = myIndex + 1
      const total = jobApps.length
      const percentile = total > 1 ? Math.round(((total - rank) / (total - 1)) * 100) : 100

      rankingData.push({
        jobId,
        jobTitle: app.jobs?.title || 'Unknown',
        company: app.jobs?.company_name || '',
        rank,
        totalApplicants: total,
        percentile,
        myScore: app.match_score || 0,
      })
    }

    setRankings(rankingData)

    // 4. Weekly progress — last 4 weeks
    const weeks = []
    const now = new Date()
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (w + 1) * 7)
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() - w * 7)

      const weekApps = allApps.filter(a => {
        const d = new Date(a.created_at)
        return d >= weekStart && d < weekEnd
      })

      // For interviews/offers, check status change dates within the week
      const weekInterviews = allApps.filter(a => {
        if (a.status !== 'interview' && a.status !== 'offered') return false
        const d = new Date(a.updated_at || a.created_at)
        return d >= weekStart && d < weekEnd
      })

      const weekOffers = allApps.filter(a => {
        if (a.status !== 'offered') return false
        const d = new Date(a.updated_at || a.created_at)
        return d >= weekStart && d < weekEnd
      })

      const label = w === 0 ? 'This week' : w === 1 ? 'Last week' : `${w + 1}w ago`

      weeks.push({
        label,
        applied: weekApps.length,
        interviews: weekInterviews.length,
        offers: weekOffers.length,
      })
    }
    setWeeklyData(weeks)

    setLoading(false)
  }

  if (loading) return <LoadingSpinner className="min-h-[60vh]" size="lg" />

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-purple-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-primary">Analytics Dashboard</h1>
              <p className="text-sm text-primary/50">Track your application performance and market insights</p>
            </div>
          </div>
        </div>
        <Link to="/dashboard" className="btn-secondary text-sm py-2 px-4 hidden sm:flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
      </div>

      {/* Summary Stats */}
      <SummaryStats apps={apps} profile={profile} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Application Funnel */}
        <ApplicationFunnel apps={apps} />

        {/* Weekly Progress */}
        <WeeklyProgress weeklyData={weeklyData} />
      </div>

      {/* Skill Demand Heatmap — full width */}
      <div className="mt-6">
        <SkillDemandHeatmap skillDemand={skillDemand} />
      </div>

      {/* Applicant Ranking */}
      {rankings.length > 0 && (
        <div className="mt-6">
          <ApplicantRanking rankings={rankings} />
        </div>
      )}

      {/* CTA */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/jobs" className="card text-center hover:border-accent group py-5">
          <Zap className="w-7 h-7 text-accent mx-auto mb-2" />
          <p className="font-medium text-sm group-hover:text-accent">Find More Jobs</p>
        </Link>
        <Link to="/resume-match" className="card text-center hover:border-accent group py-5">
          <Target className="w-7 h-7 text-accent mx-auto mb-2" />
          <p className="font-medium text-sm group-hover:text-accent">Improve Match Score</p>
        </Link>
        <Link to="/interview" className="card text-center hover:border-accent group py-5">
          <Award className="w-7 h-7 text-accent mx-auto mb-2" />
          <p className="font-medium text-sm group-hover:text-accent">Practice Interview</p>
        </Link>
      </div>
    </div>
  )
}
